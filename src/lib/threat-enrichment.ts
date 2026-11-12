export type IndicatorType = "ip" | "domain" | "url" | "hash";
export type ThreatSeverity = "critical" | "high" | "medium" | "low" | "unknown";
export type SourceState = "matched" | "no-match" | "unavailable" | "error";

export interface EnrichmentFinding {
  id: string;
  source: "ThreatFox" | "AbuseIPDB" | "Pulsedive" | "URLhaus";
  title: string;
  detail: string;
  observedAt: string | null;
  reference: string | null;
  confidence: number | null;
}

export interface SourceResult {
  source: EnrichmentFinding["source"];
  state: SourceState;
  message: string;
  checkedAt: string;
  findings: EnrichmentFinding[];
}

export interface IndicatorResult {
  indicator: string;
  type: IndicatorType;
  score: number;
  severity: ThreatSeverity;
  rationale: string[];
  sources: SourceResult[];
  findings: EnrichmentFinding[];
  enrichedAt: string;
}

const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const hash = /^(?:[a-f\d]{32}|[a-f\d]{40}|[a-f\d]{64})$/i;

function isIpv6(value: string): boolean {
  if (!/^[\da-f:]+$/i.test(value) || !value.includes(":") || value.includes(":::")) return false;
  if ((value.match(/::/g) ?? []).length > 1) return false;
  const compressed = value.includes("::");
  const groups = value.split(":").filter(Boolean);
  if (groups.some((group) => group.length > 4)) return false;
  return compressed ? groups.length < 8 : groups.length === 8;
}

export function normalizeIndicator(raw: string): { indicator: string; type: IndicatorType } {
  let value = raw.trim();
  if (!value) throw new Error("Enter an indicator.");
  if (value.length > 2048) throw new Error("Indicators must be 2,048 characters or fewer.");
  if (/^https?:\/\//i.test(value)) {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) throw new Error("URLs containing credentials are not supported.");
    parsed.hash = "";
    return { indicator: parsed.toString(), type: "url" };
  }
  value = value.replace(/\.$/, "").toLowerCase();
  if (ipv4.test(value)) return { indicator: value, type: "ip" };
  const ipv6 = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  if (isIpv6(ipv6)) return { indicator: ipv6, type: "ip" };
  if (value.includes(":")) throw new Error(`Invalid IP address: ${raw}`);
  if (hash.test(value)) return { indicator: value, type: "hash" };
  if (value.includes("/") || value.includes("?")) throw new Error(`Invalid domain or URL: ${raw}`);
  if (value.length > 253 || !/^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i.test(value)) {
    throw new Error(`Unsupported indicator: ${raw}`);
  }
  return { indicator: value, type: "domain" };
}

export function deduplicateFindings(findings: EnrichmentFinding[]): EnrichmentFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.source}:${finding.id || `${finding.title}:${finding.detail}`}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scoreIndicator(sources: SourceResult[]): Pick<IndicatorResult, "score" | "severity" | "rationale"> {
  const findings = deduplicateFindings(sources.flatMap((source) => source.findings));
  const matched = sources.filter((source) => source.state === "matched").length;
  let score = 0;
  const rationale: string[] = [];
  if (findings.length) {
    score = Math.max(...findings.map((finding) => {
      const confidence = finding.confidence === null ? 70 : Math.max(0, Math.min(100, finding.confidence));
      return Math.round(35 + confidence * 0.55);
    }));
    rationale.push(`${findings.length} distinct positive finding${findings.length === 1 ? "" : "s"} across ${matched} source${matched === 1 ? "" : "s"}.`);
    const newest = findings.map((finding) => finding.observedAt).filter(Boolean).sort().at(-1);
    if (newest) rationale.push(`Latest source observation: ${newest}.`);
  } else if (matched) {
    rationale.push("No positive findings in responding sources; this is not proof that the indicator is safe.");
  } else {
    rationale.push("No sources returned a usable response; score is unknown.");
  }
  const scoreValue = findings.length ? Math.min(100, score + Math.min(15, Math.max(0, matched - 1) * 5)) : 0;
  const severity: ThreatSeverity = !matched ? "unknown" : scoreValue >= 90 ? "critical" : scoreValue >= 75 ? "high" : scoreValue >= 50 ? "medium" : scoreValue > 0 ? "low" : "unknown";
  if (findings.length && matched > 1) rationale.push(`+${Math.min(15, (matched - 1) * 5)} corroboration points for independent responding sources; capped at 15.`);
  return { score: scoreValue, severity, rationale };
}

export function normalizeEnrichment(input: { indicator: string; type: IndicatorType; sources: SourceResult[]; enrichedAt?: string }): IndicatorResult {
  const findings = deduplicateFindings(input.sources.flatMap((source) => source.findings));
  const scored = scoreIndicator(input.sources);
  return { ...input, findings, ...scored, enrichedAt: input.enrichedAt ?? new Date().toISOString() };
}

