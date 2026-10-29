import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/seo";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, Play, Workflow, XCircle } from "lucide-react";
import { PLAYBOOKS } from "@/lib/playbooks";
import { runPlaybook } from "@/lib/workflows.functions";
import { VerdictBadge } from "@/components/verdict-badge";

const TITLE = "Security Automation Playbooks for SOC Triage | SentinelGrid";
const DESCRIPTION =
  "Automated OSINT playbooks for phishing triage, vendor due diligence, attack-surface review and incident enrichment — each ends in a clear recommendation.";

export const Route = createFileRoute("/workflows")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/workflows") },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/workflows") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "SentinelGrid automation playbooks",
          itemListElement: PLAYBOOKS.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.name,
            description: p.outcome,
          })),
        }),
      },
    ],
  }),
  component: Workflows,
});

const STATUS_ICON = {
  ok: CheckCircle2,
  partial: CircleAlert,
  failed: XCircle,
} as const;

const STATUS_COLOR = {
  ok: "text-clean",
  partial: "text-caution",
  failed: "text-malicious",
} as const;

function Workflows() {
  const execute = useServerFn(runPlaybook);
  const [slug, setSlug] = useState(PLAYBOOKS[0]!.slug);
  const [target, setTarget] = useState("example.com");

  const active = PLAYBOOKS.find((p) => p.slug === slug)!;

  const mutation = useMutation({
    mutationFn: (vars: { slug: string; target: string }) => execute({ data: vars }),
  });

  const run = mutation.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <p className="label-mono">Automation</p>
        <h1 className="mt-3 text-4xl font-bold">Workflows that end in a decision</h1>
        <p className="mt-4 text-muted-foreground">
          A playbook chains OSINT lookups into an ordered investigation, then returns a verdict, a
          recommendation and the evidence behind both — ready to paste into a ticket.
        </p>
      </header>

      <div className="mt-10 grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <h2 className="label-mono">Playbooks</h2>
          {PLAYBOOKS.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSlug(p.slug)}
              className={`block w-full rounded-lg border p-4 text-left transition-colors ${
                p.slug === slug
                  ? "border-primary/50 bg-panel-raised"
                  : "border-border bg-panel hover:bg-accent/50"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                  {p.tier.toUpperCase()}
                </span>
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground">{p.outcome}</span>
              <span className="mt-3 block font-mono text-[10px] text-muted-foreground">
                {p.steps.length} steps · {p.sla} · accepts {p.accepts}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <section className="surface-raised p-6">
            <div className="flex items-center gap-2">
              <Workflow className="size-4 text-primary" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold">{active.name}</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{active.outcome}</p>

            <ol className="mt-5 space-y-3">
              {active.steps.map((s, i) => (
                <li key={s.id} className="flex gap-3 rounded-md border border-border p-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border font-mono text-[11px]">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{s.title}</span>
                    <span className="block text-xs text-muted-foreground">{s.description}</span>
                  </span>
                </li>
              ))}
            </ol>

            <form
              className="mt-6 flex flex-wrap gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (target.trim()) mutation.mutate({ slug, target: target.trim() });
              }}
            >
              <label htmlFor="wf-target" className="sr-only">
                Target ({active.accepts})
              </label>
              <input
                id="wf-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={active.accepts === "IP address" ? "8.8.8.8" : "example.com"}
                spellCheck={false}
                className="min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-ring"
              />
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="size-4" aria-hidden="true" />
                )}
                {mutation.isPending ? "Running…" : "Run playbook"}
              </button>
            </form>
            {mutation.isError && (
              <p className="mt-3 text-sm text-malicious">
                {(mutation.error as Error).message || "Playbook failed."}
              </p>
            )}
          </section>

          {run && (
            <section className="surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">
                  Run result · <span className="font-mono text-sm">{run.target}</span>
                </h2>
                <VerdictBadge verdict={run.verdict} />
              </div>
              <p className="mt-3 rounded-md border border-border bg-background p-4 text-sm">
                {run.recommendation}
              </p>

              <ol className="mt-5 space-y-3">
                {run.steps.map((s) => {
                  const Icon = STATUS_ICON[s.status];
                  return (
                    <li key={s.id} className="rounded-md border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Icon className={`size-4 ${STATUS_COLOR[s.status]}`} aria-hidden="true" />
                        <h3 className="text-sm font-semibold">{s.title}</h3>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {s.findings.map((f) => (
                          <li key={f}>• {f}</li>
                        ))}
                      </ul>
                      {s.facts.length > 0 && (
                        <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {s.facts.map((f) => (
                            <div key={f.key} className="text-xs">
                              <dt className="text-muted-foreground">{f.key}</dt>
                              <dd className="font-mono break-words">{f.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                Finished {new Date(run.finishedAt).toLocaleString()} · risk {run.score}/100
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
