const TIMEOUT = 12_000;

export interface CveItem {
  id: string;
  summary: string;
  published: string;
  severity: "critical" | "high" | "medium" | "low" | "unscored";
  score: number | null;
}

function bucket(score: number | null): CveItem["severity"] {
  if (score === null) return "unscored";
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

/** Public NVD feed — keyless, rate limited, so results are cached by the route. */
export async function fetchRecentCves(limit = 20): Promise<CveItem[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 3 * 86_400_000);
  const url =
    "https://services.nvd.nist.gov/rest/json/cves/2.0?" +
    new URLSearchParams({
      pubStartDate: start.toISOString().slice(0, 19) + ".000",
      pubEndDate: end.toISOString().slice(0, 19) + ".000",
      resultsPerPage: String(limit),
    }).toString();

  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "SentinelGrid-ThreatIntel/1.0" },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`NVD responded ${res.status}`);
  const data: any = await res.json();

  return ((data.vulnerabilities ?? []) as any[]).map((v) => {
    const cve = v.cve ?? {};
    const metrics = cve.metrics ?? {};
    const primary =
      metrics.cvssMetricV31?.[0] ?? metrics.cvssMetricV30?.[0] ?? metrics.cvssMetricV2?.[0];
    const score: number | null = primary?.cvssData?.baseScore ?? null;
    return {
      id: cve.id ?? "unknown",
      summary:
        (cve.descriptions ?? []).find((d: any) => d.lang === "en")?.value ?? "No description yet.",
      published: cve.published ?? "",
      severity: bucket(score),
      score,
    };
  });
}
