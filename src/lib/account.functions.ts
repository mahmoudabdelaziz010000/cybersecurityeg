import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RecentScan {
  id: string;
  kind: string;
  label: string;
  target: string;
  verdict: string;
  score: number;
  created_at: string;
}

export const getAccountOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getQuotaStatus } = await import("./quota.server");
    const quota = await getQuotaStatus(context.userId);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name, email, plan_id, created_at")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: scans } = await context.supabase
      .from("scan_runs")
      .select("id, kind, label, target, verdict, score, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      quota,
      profile: profile ?? null,
      recent: (scans ?? []) as RecentScan[],
    };
  });

export const updateDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const value = (data as { displayName?: unknown }).displayName;
    if (typeof value !== "string" || value.trim().length < 2 || value.length > 60) {
      throw new Error("Display name must be between 2 and 60 characters.");
    }
    return { displayName: value.trim() };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
