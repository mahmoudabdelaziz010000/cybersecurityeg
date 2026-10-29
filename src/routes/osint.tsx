import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl, facebookShareUrl, ogImageMeta } from "@/lib/seo";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Facebook, Loader2, Play } from "lucide-react";
import { SOURCE_CATALOG } from "@/lib/osint-catalog";
import type { HubResult } from "@/lib/osint-catalog";
import { runHubScan } from "@/lib/osint.functions";
import { VerdictBadge } from "@/components/verdict-badge";

const TITLE = "Free OSINT Lookup Tool for IPs & Domains | SentinelGrid";
const DESCRIPTION =
  "Look up an IP or domain across Shodan InternetDB, RDAP, DNS, certificate transparency and HTTP security headers at once. Free, keyless, passive OSINT.";

export const Route = createFileRoute("/osint")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/osint") },
      ...ogImageMeta("osint", "SentinelGrid OSINT Data Hub: check any IP or domain across five sources"),
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/osint") }],
  }),
  component: OsintHub,
});

function toCsv(results: HubResult[]): string {
  const rows = [["target", "type", "verdict", "risk_score", "findings", "scanned_at"]];
  for (const r of results) {
    rows.push([r.target, r.type, r.verdict, String(r.score), r.headline.join(" | "), r.scannedAt]);
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function OsintHub() {
  const scan = useServerFn(runHubScan);
  const [targets, setTargets] = useState("8.8.8.8\nexample.com");
  const [selected, setSelected] = useState<string[]>(SOURCE_CATALOG.map((s) => s.id));
  const [openTarget, setOpenTarget] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { targets: string[]; sources: string[] }) => scan({ data: vars }),
  });

  const results = mutation.data?.results ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const list = targets
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (!list.length || !selected.length) return;
    setOpenTarget(null);
    mutation.mutate({ targets: list, sources: selected });
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <p className="label-mono">Flagship tool</p>
        <h1 className="mt-3 text-4xl font-bold">OSINT Data Hub</h1>
        <p className="mt-4 text-muted-foreground">
          One target, every connector, one normalised verdict. All collection is passive — public
          registries, DNS, certificate transparency and published HTTP responses only.
        </p>
      </header>

      <form onSubmit={submit} className="mt-10 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-raised p-5">
          <label htmlFor="targets" className="label-mono">
            Targets — one per line
          </label>
          <textarea
            id="targets"
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            rows={6}
            spellCheck={false}
            className="mt-3 w-full resize-none rounded-md border border-input bg-background p-3 font-mono text-sm outline-none focus:border-ring"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending || !selected.length}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              {mutation.isPending ? "Scanning…" : "Run hub scan"}
            </button>
            {results.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => download("sentinelgrid-scan.csv", toCsv(results), "text/csv")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <Download className="size-3.5" aria-hidden="true" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    download(
                      "sentinelgrid-scan.json",
                      JSON.stringify(results, null, 2),
                      "application/json",
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <Download className="size-3.5" aria-hidden="true" /> JSON
                </button>
                <a
                  href={facebookShareUrl("/osint", "scan_result")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <Facebook className="size-3.5" aria-hidden="true" /> Share
                </a>
              </>
            )}
          </div>
          {mutation.isError && (
            <p className="mt-3 text-sm text-malicious">
              {(mutation.error as Error).message || "Scan failed."}
            </p>
          )}
        </div>

        <fieldset className="surface-raised p-5">
          <legend className="label-mono">Data sources</legend>
          <ul className="mt-3 space-y-2">
            {SOURCE_CATALOG.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggle(s.id)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {s.types.join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </form>

      {mutation.isPending && (
        <div className="scanline surface mt-6 h-1">
          <span className="scanline-bar" />
        </div>
      )}

      {results.length > 0 && (
        <section className="mt-10">
          <h2 className="label-mono">Results</h2>
          <div className="mt-4 space-y-3">
            {results.map((r) => (
              <article key={r.target} className="surface overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenTarget(openTarget === r.target ? null : r.target)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left hover:bg-accent/50"
                  aria-expanded={openTarget === r.target}
                >
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm">{r.target}</span>
                    <VerdictBadge verdict={r.verdict} />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {r.type} · risk {r.score}/100
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {openTarget === r.target ? "Hide evidence" : "Show evidence"}
                  </span>
                </button>

                {r.headline.length > 0 && (
                  <ul className="border-t border-border px-5 py-3 text-sm text-caution">
                    {r.headline.map((h) => (
                      <li key={h}>• {h}</li>
                    ))}
                  </ul>
                )}

                {openTarget === r.target && (
                  <div className="grid gap-3 border-t border-border p-5 md:grid-cols-2">
                    {r.sources.map((s) => (
                      <div key={s.id} className="rounded-md border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">{s.label}</h3>
                          <span
                            className={`font-mono text-[10px] uppercase ${s.ok ? "text-clean" : "text-malicious"}`}
                          >
                            {s.ok ? "ok" : (s.error ?? "failed")}
                          </span>
                        </div>
                        <dl className="mt-3 space-y-1.5">
                          {s.facts.map((f) => (
                            <div key={f.key} className="grid grid-cols-[130px_1fr] gap-2 text-xs">
                              <dt className="text-muted-foreground">{f.key}</dt>
                              <dd className="font-mono break-words">{f.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 max-w-3xl">
        <h2 className="font-display text-2xl font-semibold">How the hub scores a target</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Each connector returns a risk contribution: exposed CVEs and newly registered
          infrastructure weigh heaviest, missing SPF and absent security headers add moderate risk,
          and a large certificate footprint adds a small amount. The highest single contribution sets
          the verdict — <strong className="text-clean">clean</strong> under 25,{" "}
          <strong className="text-caution">caution</strong> from 25 to 59, and{" "}
          <strong className="text-malicious">malicious</strong> at 60 or above — so one strong signal
          is never diluted by quiet sources.
        </p>
      </section>
    </div>
  );
}
