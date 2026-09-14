export const GUEST_MAX_TARGETS_PER_RUN = 2;

export interface QuotaStatus {
  planId: string;
  planName: string;
  /** null means unlimited */
  monthlyScanLimit: number | null;
  maxTargetsPerRun: number;
  used: number;
  remaining: number | null;
  /** Purchased scan credits usable once the plan allowance runs out. */
  credits: number;
  periodResetsAt: string;
}

function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan_id")
    .eq("id", userId)
    .maybeSingle();

  const planId = profile?.plan_id ?? "recon";

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("id, name, monthly_scan_limit, max_targets_per_run")
    .eq("id", planId)
    .maybeSingle();

  const { count } = await supabaseAdmin
    .from("scan_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonthUtc().toISOString());

  const used = count ?? 0;
  const monthlyScanLimit = plan?.monthly_scan_limit ?? null;

  const { getCreditBalance } = await import("./billing.server");
  const credits = await getCreditBalance(userId);

  return {
    planId,
    planName: plan?.name ?? "Recon",
    monthlyScanLimit,
    maxTargetsPerRun: plan?.max_targets_per_run ?? GUEST_MAX_TARGETS_PER_RUN,
    used,
    remaining: monthlyScanLimit === null ? null : Math.max(0, monthlyScanLimit - used),
    credits,
    periodResetsAt: startOfNextMonthUtc().toISOString(),
  };
}

export interface QuotaGrant {
  userId: string | null;
  allowedTargets: number;
}

/**
 * Enforces per-plan limits before a scan runs. Anonymous visitors get a small
 * trial allowance; signed-in users get their plan's allowance.
 */
export async function authorizeScan(
  userId: string | null,
  requestedTargets: number,
): Promise<QuotaGrant> {
  if (!userId) {
    if (requestedTargets > GUEST_MAX_TARGETS_PER_RUN) {
      throw new Error(
        `Sign in to scan more than ${GUEST_MAX_TARGETS_PER_RUN} targets at once — free accounts include 25 scans a month.`,
      );
    }
    return { userId: null, allowedTargets: GUEST_MAX_TARGETS_PER_RUN };
  }

  const quota = await getQuotaStatus(userId);

  if (requestedTargets > quota.maxTargetsPerRun) {
    throw new Error(
      `Your ${quota.planName} plan allows ${quota.maxTargetsPerRun} targets per run. Upgrade for larger batches.`,
    );
  }

  if (quota.remaining !== null && requestedTargets > quota.remaining + quota.credits) {
    throw new Error(
      `Monthly scan quota reached (${quota.used}/${quota.monthlyScanLimit}). It resets on the 1st — buy a credit pack or upgrade your plan to keep scanning now.`,
    );
  }

  return { userId, allowedTargets: quota.maxTargetsPerRun };
}

export interface ScanRunRecord {
  kind: "osint" | "playbook";
  label: string;
  target: string;
  verdict: string;
  score: number;
}

export async function recordScanRuns(userId: string | null, runs: ScanRunRecord[]) {
  if (!userId || !runs.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Anything above the plan allowance is paid for with purchased credits.
  const before = await getQuotaStatus(userId);
  await supabaseAdmin.from("scan_runs").insert(runs.map((r) => ({ ...r, user_id: userId })));

  if (before.remaining !== null) {
    const overage = Math.max(0, runs.length - before.remaining);
    if (overage > 0) {
      const { consumeCredits } = await import("./billing.server");
      await consumeCredits(userId, Math.min(overage, before.credits), "Scan overage");
    }
  }
}
