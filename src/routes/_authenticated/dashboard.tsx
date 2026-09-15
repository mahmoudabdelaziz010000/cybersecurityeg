import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { getAccountOverview, updateDisplayName } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { VerdictBadge } from "@/components/verdict-badge";
import type { Verdict } from "@/lib/osint-catalog";

const TITLE = "Analyst Dashboard — Plan, Scan Quota & History | SentinelGrid";
const DESCRIPTION =
  "Track your monthly scan quota, plan limits and the full history of OSINT lookups and playbook runs in your SentinelGrid workspace.";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getAccountOverview);
  const saveName = useServerFn(updateDisplayName);
  const [name, setName] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => fetchOverview(),
  });

  const rename = useMutation({
    mutationFn: (displayName: string) => saveName({ data: { displayName } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-overview"] }),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm text-malicious">Could not load your workspace. Try refreshing.</p>
      </div>
    );
  }

  const { quota, profile, recent } = data;
  const pct =
    quota.monthlyScanLimit === null
      ? 0
      : Math.min(100, Math.round((quota.used / quota.monthlyScanLimit) * 100));

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">Workspace</p>
          <h1 className="mt-2 text-3xl font-bold">
            {profile?.display_name ?? "Analyst"}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{profile?.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="surface-raised p-6 lg:col-span-2">
          <h2 className="label-mono">Monthly scan quota</h2>
          <p className="mt-3 font-display text-3xl font-semibold">
            {quota.used}
            <span className="text-base text-muted-foreground">
              {" "}
              / {quota.monthlyScanLimit ?? "unlimited"}
            </span>
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${quota.monthlyScanLimit === null ? 4 : pct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Resets {new Date(quota.periodResetsAt).toLocaleDateString()} · up to{" "}
            {quota.maxTargetsPerRun} targets per run.
          </p>
        </article>

        <article className="surface p-6">
          <h2 className="label-mono">Current plan</h2>
          <p className="mt-3 font-display text-2xl font-semibold">{quota.planName}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {quota.remaining === null
              ? "Unlimited scans on your agreement."
              : `${quota.remaining} scans left this period.`}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {quota.credits.toLocaleString()} purchased credits in reserve
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/billing"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Upgrade or buy credits
            </Link>
            <Link
              to="/pricing"
              className="inline-flex rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Compare plans
            </Link>
          </div>
        </article>
      </section>

      <section className="surface mt-4 p-6">
        <h2 className="label-mono">Profile</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) rename.mutate(name);
          }}
        >
          <input
            aria-label="Display name"
            value={name}
            placeholder={profile?.display_name ?? "Display name"}
            onChange={(e) => setName(e.target.value)}
            className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={rename.isPending}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            {rename.isPending ? "Saving…" : "Update name"}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="label-mono">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="surface mt-4 p-6 text-sm text-muted-foreground">
            No scans yet.{" "}
            <Link to="/osint" className="text-primary hover:underline">
              Run your first OSINT lookup
            </Link>
            .
          </p>
        ) : (
          <div className="surface mt-4 divide-y divide-border">
            {recent.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="font-mono text-sm">{r.target}</span>
                <VerdictBadge verdict={r.verdict as Verdict} />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {r.label} · risk {r.score}/100
                </span>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
