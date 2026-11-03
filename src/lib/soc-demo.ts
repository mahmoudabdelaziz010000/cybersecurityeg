import { EVENTS, PROVIDERS, SEVERITIES, type Severity, type TelemetryEvent } from "./xdr-demo";

/**
 * Synthetic fixtures for the SOC dashboard prototype. Everything here is browser-safe sample data:
 * nothing is fetched, no provider is authorized and no live telemetry is ingested.
 */
export const SNAPSHOT_LABEL = "02 Nov 2026 · 12:00 UTC";

/** Sample endpoint fleet. online + offline + outdated always equals total. */
export const FLEET = { total: 1248, online: 1176, offline: 49, outdated: 23 } as const;

/** Sample response-time figures, in minutes. */
export const RESPONSE = { mttd: 9, mttr: 38 } as const;

/** Sample 14-day threat activity ending on the snapshot day. */
export const THREAT_TREND_14D = [
  { day: "20 Oct", detected: 31, mitigated: 29 },
  { day: "21 Oct", detected: 27, mitigated: 26 },
  { day: "22 Oct", detected: 35, mitigated: 31 },
  { day: "23 Oct", detected: 29, mitigated: 28 },
  { day: "24 Oct", detected: 24, mitigated: 24 },
  { day: "25 Oct", detected: 18, mitigated: 17 },
  { day: "26 Oct", detected: 16, mitigated: 16 },
  { day: "27 Oct", detected: 33, mitigated: 30 },
  { day: "28 Oct", detected: 38, mitigated: 34 },
  { day: "29 Oct", detected: 41, mitigated: 37 },
  { day: "30 Oct", detected: 36, mitigated: 35 },
  { day: "31 Oct", detected: 30, mitigated: 27 },
  { day: "01 Nov", detected: 26, mitigated: 25 },
  { day: "02 Nov", detected: 22, mitigated: 15 },
] as const;

const SEVERITY_RANK: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };

export function socMetrics(events: TelemetryEvent[]) {
  const open = events.filter((event) => event.status === "Open");
  return {
    active: open.length,
    critical: open.filter((event) => event.severity === "Critical").length,
    mitigated: events.filter((event) => event.status === "Resolved").length,
    sources: new Set(events.map((event) => event.source)).size,
  };
}

/** Open threats per severity, always listing every severity so charts keep a stable shape. */
export function openBySeverity(events: TelemetryEvent[]) {
  return SEVERITIES.map((severity) => ({
    severity,
    count: events.filter((event) => event.status === "Open" && event.severity === severity).length,
  }));
}

/** MITRE ATT&CK tactics seen in the events, most frequent first (ties alphabetical). */
export function tacticBreakdown(events: TelemetryEvent[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.technique) counts.set(event.technique.tactic, (counts.get(event.technique.tactic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tactic, count]) => ({ tactic, count }))
    .sort((a, b) => b.count - a.count || a.tactic.localeCompare(b.tactic));
}

/** Assets with the most open threats, most affected first; ties go to the more severe asset. */
export function topAssets(events: TelemetryEvent[], limit = 5) {
  const byAsset = new Map<string, { asset: string; count: number; worst: Severity }>();
  for (const event of events) {
    if (event.status !== "Open") continue;
    const current = byAsset.get(event.asset);
    if (!current) byAsset.set(event.asset, { asset: event.asset, count: 1, worst: event.severity });
    else {
      current.count += 1;
      if (SEVERITY_RANK[event.severity] < SEVERITY_RANK[current.worst]) current.worst = event.severity;
    }
  }
  return [...byAsset.values()]
    .sort((a, b) => b.count - a.count || SEVERITY_RANK[a.worst] - SEVERITY_RANK[b.worst] || a.asset.localeCompare(b.asset))
    .slice(0, limit);
}

export function fleetOnlinePercent() {
  return Math.round((FLEET.online / FLEET.total) * 100);
}

/** Sample events per provider group, for the telemetry coverage strip. */
export function groupCoverage(events: TelemetryEvent[] = EVENTS) {
  return [...new Set(PROVIDERS.map((provider) => provider.group))].map((group) => {
    const providers = PROVIDERS.filter((provider) => provider.group === group);
    return {
      group,
      providers: providers.length,
      withSamples: providers.filter((provider) => provider.demo).length,
      events: events.filter((event) => providers.some((provider) => provider.id === event.source)).length,
    };
  });
}
