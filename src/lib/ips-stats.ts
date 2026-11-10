import type { IpsCoverage, IpsData, IpsSignature } from "./sophos-catalog";
import type { Severity } from "./xdr-demo";

export const IPS_SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

export type IpsStats = {
  total: number;
  blocking: number;
  detectOnly: number;
  disabled: number;
  coveredRules: number;
  totalRules: number;
  /** Share of firewall accept rules that have an IPS policy, 0-100. `null` when there are no rules. */
  coveragePercent: number | null;
  uncovered: IpsCoverage[];
  severity: { level: Severity; count: number }[];
  categories: { name: string; count: number }[];
  /** Summed hits per 2-hour bucket. Empty when the source exposes no hit counts. */
  timeline: number[];
  topByHits: { signature: IpsSignature; total: number }[];
};

export function ipsStats(ips: IpsData, topCategories = 6, topSignatures = 5): IpsStats {
  const { signatures, coverage } = ips;
  const blocking = signatures.filter((s) => s.action !== "Detect").length;
  const coveredRules = coverage.filter((c) => c.covered).length;

  const counts = new Map<string, number>();
  for (const s of signatures) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);

  const withHits = signatures.filter((s): s is IpsSignature & { hits: number[] } => Array.isArray(s.hits) && s.hits.length > 0);
  const buckets = withHits.reduce((max, s) => Math.max(max, s.hits.length), 0);
  const timeline = Array.from({ length: buckets }, (_, i) => withHits.reduce((sum, s) => sum + (s.hits[i] ?? 0), 0));

  return {
    total: signatures.length,
    blocking,
    detectOnly: signatures.length - blocking,
    disabled: signatures.filter((s) => !s.enabled).length,
    coveredRules,
    totalRules: coverage.length,
    coveragePercent: coverage.length ? Math.round((coveredRules / coverage.length) * 100) : null,
    uncovered: coverage.filter((c) => !c.covered),
    severity: IPS_SEVERITIES.map((level) => ({ level, count: signatures.filter((s) => s.severity === level).length })),
    categories: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, topCategories),
    timeline,
    topByHits: withHits
      .map((signature) => ({ signature, total: signature.hits.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total || a.signature.id.localeCompare(b.signature.id, undefined, { numeric: true }))
      .slice(0, topSignatures),
  };
}
