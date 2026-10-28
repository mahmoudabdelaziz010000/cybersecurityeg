import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, ShieldAlert, Play } from "lucide-react";
import {
  OWASP_CHECKS,
  SEVERITY_META,
  SEVERITY_ORDER,
  scoreFindings,
  type CheckResult,
  type Finding,
  type Severity,
} from "@/lib/owasp-catalog";
import { recordOwaspScan, runOwaspCheck, startOwaspScan } from "@/lib/owasp.functions";

const TITLE = "OWASP Web Security Scanner — Headers, CORS, Injection | SentinelGrid";
const DESCRIPTION =
  "Scan any website against OWASP Top 10 checks: missing security headers, CORS misconfiguration, cookie flags, exposed files and injection signatures — with severity ranking and remediation code.";

export const Route = createFileRoute("/owasp")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/owasp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/owasp" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "SentinelGrid OWASP Scanner",
          applicationCategory: "SecurityApplication",
          operatingSystem: "Web",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: OwaspScanner,
});

interface Progress {
  done: number;
  total: number;
  current: string | null;
}

function SeverityPill({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider ${m.className}`}
    >
      <span className={`size-1.5 rounded-full ${m.dot}`} aria-hidden="true" />
      {m.label}
    </span>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(finding.severity === "critical" || finding.severity === "high");
  return (
    <article className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left hover:bg-accent/40"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2.5">
            <SeverityPill severity={finding.severity} />
            <span className="font-mono text-[11px] text-muted-foreground">{finding.owasp}</span>
          </span>
          <h3 className="mt-2 text-sm font-semibold">{finding.title}</h3>
          <p className="mt-1 font-mono text-[11px] break-words text-muted-foreground">
            {finding.evidence}
          </p>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {open ? "Hide fix" : "Show fix"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-5">
          <div>
            <p className="label-mono">Why it matters</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{finding.description}</p>
          </div>
          <div>
            <p className="label-mono">Remediation</p>
            <p className="mt-1.5 text-sm">{finding.remediation}</p>
          </div>
          {finding.snippet && (
            <div>
              <p className="label-mono">Example fix — {finding.snippet.lang}</p>
              <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-[12px] leading-relaxed">
                <code>{finding.snippet.code}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function OwaspScanner() {
  const start = useServerFn(startOwaspScan);
  const check = useServerFn(runOwaspCheck);
  const record = useServerFn(recordOwaspScan);

  const [target, setTarget] = useState("example.com");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0, current: null });
  const [results, setResults] = useState<CheckResult[]>([]);
  const [scanned, setScanned] = useState<string | null>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const runId = useRef(0);

  const findings = results.flatMap((r) => r.findings);
  const counts = SEVERITY_ORDER.map((s) => ({
    severity: s,
    count: findings.filter((f) => f.severity === s).length,
  }));
  const score = scoreFindings(findings);
  const failed = results.filter((r) => !r.ok);

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_META[b.severity].weight - SEVERITY_META[a.severity].weight,
  );
  const visible = filter === "all" ? sorted : sorted.filter((f) => f.severity === filter);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (running || !target.trim()) return;
    const id = ++runId.current;

    setRunning(true);
    setError(null);
    setResults([]);
    setFilter("all");
    setProgress({ done: 0, total: OWASP_CHECKS.length, current: "Resolving target…" });

    try {
      const { target: normalized } = await start({ data: { target: target.trim() } });
      if (runId.current !== id) return;
      setScanned(normalized);

      const collected: CheckResult[] = [];
      for (const meta of OWASP_CHECKS) {
        if (runId.current !== id) return;
        setProgress((p) => ({ ...p, current: meta.label }));
        const res = await check({ data: { target: normalized, checkId: meta.id } });
        if (runId.current !== id) return;
        collected.push(res);
        setResults([...collected]);
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }

      setProgress((p) => ({ ...p, current: null }));
      await record({
        data: {
          target: normalized,
          findings: collected.flatMap((r) => r.findings.map((f) => ({ severity: f.severity }))),
        },
      }).catch(() => undefined);
    } catch (err) {
      if (runId.current !== id) return;
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      if (runId.current === id) setRunning(false);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ target: scanned, results }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sentinelgrid-owasp-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <p className="label-mono">Application security</p>
        <h1 className="mt-3 text-4xl font-bold">OWASP Web Security Scanner</h1>
        <p className="mt-4 text-muted-foreground">
          Ten non-destructive checks mapped to the OWASP Top 10 — transport security, response
          headers, CSP quality, CORS policy, cookie flags, exposed deployment files and injection
          signatures. Every finding comes back severity-ranked with the fix.
        </p>
      </header>

      <form onSubmit={runScan} className="surface-raised mt-8 p-5">
        <label htmlFor="owasp-target" className="label-mono">
          Target URL or hostname
        </label>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            id="owasp-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            spellCheck={false}
            placeholder="https://example.com"
            className="min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={running}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {running ? "Scanning…" : "Run OWASP scan"}
          </button>
          {results.length > 0 && !running && (
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <Download className="size-3.5" aria-hidden="true" /> JSON report
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Only scan assets you own or are authorised to test. All probes are single benign requests
          — no exploitation, no brute force, no writes.
        </p>
        {error && (
          <p className="mt-3 flex items-start gap-2 text-sm text-malicious">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </form>

      {(running || results.length > 0) && (
        <section className="surface mt-6 p-5" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs text-muted-foreground">
              {progress.current
                ? `Running · ${progress.current}`
                : `Completed ${progress.done} of ${progress.total} checks on ${scanned ?? target}`}
            </p>
            <p className="font-mono text-xs">{pct}%</p>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Scan progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {OWASP_CHECKS.map((c) => {
              const res = results.find((r) => r.checkId === c.id);
              const active = progress.current === c.label;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs"
                >
                  <span className={res || active ? "" : "text-muted-foreground"}>{c.label}</span>
                  <span className="shrink-0 font-mono text-[11px]">
                    {active && !res ? (
                      <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
                    ) : !res ? (
                      <span className="text-muted-foreground">queued</span>
                    ) : !res.ok ? (
                      <span className="text-caution">{res.error}</span>
                    ) : res.findings.length ? (
                      <span className="text-caution">{res.findings.length} issue(s)</span>
                    ) : (
                      <span className="text-clean">pass</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {results.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="label-mono">Findings</h2>
            <span className="font-mono text-xs text-muted-foreground">risk {score}/100</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${
                filter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              All {findings.length}
            </button>
            {counts.map(({ severity, count }) => (
              <button
                key={severity}
                type="button"
                disabled={!count}
                onClick={() => setFilter(severity)}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider disabled:opacity-35 ${
                  filter === severity ? SEVERITY_META[severity].className : "border-border"
                }`}
              >
                {SEVERITY_META[severity].label} {count}
              </button>
            ))}
          </div>

          {findings.length === 0 ? (
            <p className="surface mt-4 flex items-center gap-2 p-5 text-sm text-clean">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              No issues detected across the checks that completed.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {visible.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}

          {failed.length > 0 && (
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {failed.length} check{failed.length > 1 ? "s" : ""} could not complete:{" "}
              {failed.map((f) => `${f.label} (${f.error})`).join("; ")}
            </p>
          )}
        </section>
      )}

      <section className="mt-16 max-w-3xl">
        <h2 className="font-display text-2xl font-semibold">What each check covers</h2>
        <dl className="mt-4 space-y-3">
          {OWASP_CHECKS.map((c) => (
            <div key={c.id} className="surface p-4">
              <dt className="text-sm font-semibold">
                {c.label}{" "}
                <span className="font-mono text-[11px] font-normal text-muted-foreground">
                  {c.owasp}
                </span>
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{c.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
