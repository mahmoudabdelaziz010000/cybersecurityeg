import type { EnrichmentFinding, IndicatorType, SourceResult } from "./threat-enrichment";

const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 15 * 60_000;
const SOURCE_NAMES = ["ThreatFox", "AbuseIPDB", "Pulsedive", "URLhaus"] as const;
type SourceName = (typeof SOURCE_NAMES)[number];
// Provider schemas vary by response status; preserve the raw fields while normalizing below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const cache = new Map<string, { expiresAt: number; result: SourceResult }>();
let pulsediveQueue = Promise.resolve();
let lastPulsediveRequest = 0;

function cached(source: SourceName, indicator: string): SourceResult | undefined {
  const key = `${source}:${indicator}`;
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) { cache.delete(key); return undefined; }
  return { ...entry.result, findings: entry.result.findings.map((finding) => ({ ...finding })) };
}

function save(source: SourceName, indicator: string, result: SourceResult): SourceResult {
  cache.set(`${source}:${indicator}`, { expiresAt: Date.now() + CACHE_TTL_MS, result });
  return result;
}

function unavailable(source: SourceName, message: string): SourceResult {
  return { source, state: "unavailable", message, checkedAt: new Date().toISOString(), findings: [] };
}

function finding(source: SourceName, fields: Omit<EnrichmentFinding, "source">): EnrichmentFinding {
  return { source, ...fields };
}

async function fetchJson(url: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
  return await response.json() as Json;
}

function result(source: SourceName, findings: EnrichmentFinding[], message: string): SourceResult {
  return { source, state: findings.length ? "matched" : "no-match", message, checkedAt: new Date().toISOString(), findings };
}

async function threatFox(indicator: string): Promise<SourceResult> {
  const source: SourceName = "ThreatFox";
  const key = process.env["THREATFOX_API_KEY"];
  if (!key) return unavailable(source, "THREATFOX_API_KEY is not configured.");
  const data = await fetchJson("https://threatfox-api.abuse.ch/api/v1/", { method: "POST", headers: { "content-type": "application/json", "Auth-Key": key }, body: JSON.stringify({ query: "search_ioc", search_term: indicator, exact_match: true }) });
  if (data.query_status !== "ok" && data.query_status !== "no_result" && data.query_status !== "no_results") throw new Error(`ThreatFox query status: ${String(data.query_status ?? "unknown")}.`);
  const items = Array.isArray(data.data) ? data.data as Json[] : [];
  const findings = items.map((item) => finding(source, {
    id: String(item.id ?? `${item.ioc}:${item.malware}`), title: String(item.malware_printable ?? item.threat_type_desc ?? item.threat_type ?? "ThreatFox IOC"),
    detail: [item.ioc_type_desc ?? item.ioc_type, item.malware, item.tags].filter(Boolean).map((x) => Array.isArray(x) ? x.join(", ") : String(x)).join(" · "),
    observedAt: item.last_seen ?? item.first_seen ?? null, reference: item.reference ?? `https://threatfox.abuse.ch/ioc/${encodeURIComponent(String(item.id ?? ""))}/`, confidence: Number.isFinite(Number(item.confidence_level)) ? Number(item.confidence_level) : null,
  }));
  return result(source, findings, findings.length ? `${findings.length} exact IOC match(es).` : "No exact IOC match.");
}

async function abuseIpDb(indicator: string, type: IndicatorType): Promise<SourceResult> {
  const source: SourceName = "AbuseIPDB";
  if (type !== "ip") return unavailable(source, "AbuseIPDB checks IP addresses only.");
  const key = process.env["ABUSEIPDB_API_KEY"];
  if (!key) return unavailable(source, "ABUSEIPDB_API_KEY is not configured.");
  const url = new URL("https://api.abuseipdb.com/api/v2/check");
  url.searchParams.set("ipAddress", indicator);
  url.searchParams.set("maxAgeInDays", "90");
  const data = await fetchJson(url.toString(), { headers: { Key: key } });
  const ip = data.data ?? {};
  const confidence = Number(ip.abuseConfidenceScore ?? 0);
  const findings = confidence > 0 ? [finding(source, {
    id: indicator, title: `Abuse confidence ${confidence}%`, detail: `${ip.totalReports ?? 0} reports in the last 90 days${ip.countryCode ? ` · ${ip.countryCode}` : ""}${ip.usageType ? ` · ${ip.usageType}` : ""}`,
    observedAt: ip.lastReportedAt ?? null, reference: `https://www.abuseipdb.com/check/${encodeURIComponent(indicator)}`, confidence,
  })] : [];
  return result(source, findings, findings.length ? `${ip.totalReports ?? 0} recent report(s); confidence ${confidence}%.` : "No reports in the last 90 days.");
}

async function pacedPulsediveFetch(url: string): Promise<Json> {
  const task = pulsediveQueue.then(async () => {
    const wait = Math.max(0, 1_100 - (Date.now() - lastPulsediveRequest));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastPulsediveRequest = Date.now();
    return fetchJson(url);
  });
  pulsediveQueue = task.then(() => undefined, () => undefined);
  return task;
}

async function pulsedive(indicator: string, type: IndicatorType): Promise<SourceResult> {
  const source: SourceName = "Pulsedive";
  if (type === "hash") return unavailable(source, "Pulsedive indicator lookup does not support file hashes.");
  const key = process.env["PULSEDIVE_API_KEY"];
  if (!key) return unavailable(source, "PULSEDIVE_API_KEY is not configured.");
  const url = new URL("https://pulsedive.com/api/info.php");
  url.searchParams.set("indicator", indicator);
  url.searchParams.set("key", key);
  const data = await pacedPulsediveFetch(url.toString());
  if (data.error) throw new Error(String(data.error));
  if (data.message && !data.risk) throw new Error(String(data.message));
  const risk = String(data.risk ?? "unknown");
  const threats = Array.isArray(data.threats) ? data.threats as Json[] : [];
  const factors = Array.isArray(data.riskfactors) ? data.riskfactors as Json[] : [];
  const detected = !["unknown", "none", "", "null"].includes(risk.toLowerCase()) || threats.length > 0 || factors.length > 0;
  const findings = detected ? [finding(source, {
    id: String(data.id ?? indicator), title: `Pulsedive risk: ${risk}`, detail: [...threats.map((item) => String(item.name ?? item)), ...factors.map((item) => String(item.description ?? item.name ?? item))].join(" · ") || "Indicator has a Pulsedive risk classification.",
    observedAt: data.stamp_added ?? data.stamp_updated ?? null, reference: `https://pulsedive.com/indicator/${encodeURIComponent(indicator)}`, confidence: null,
  })] : [];
  return result(source, findings, findings.length ? `Pulsedive risk is ${risk}.` : "No positive risk classification returned.");
}

async function urlhaus(indicator: string, type: IndicatorType): Promise<SourceResult> {
  const source: SourceName = "URLhaus";
  if (type === "hash" && !/^(?:[a-f\d]{32}|[a-f\d]{64})$/i.test(indicator)) return unavailable(source, "URLhaus payload lookup supports MD5 and SHA-256, not SHA-1.");
  const key = process.env["URLHAUS_API_KEY"];
  if (!key) return unavailable(source, "URLHAUS_API_KEY is not configured.");
  let endpoint: string;
  let field: string;
  if (type === "url") { endpoint = "url"; field = "url"; }
  else if (type === "hash") { endpoint = "payload"; field = indicator.length === 32 ? "md5_hash" : "sha256_hash"; }
  else { endpoint = "host"; field = "host"; }
  const body = new URLSearchParams({ [field]: indicator });
  const data = await fetchJson(`https://urlhaus-api.abuse.ch/v1/${endpoint}/`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "Auth-Key": key }, body });
  if (data.query_status !== "ok" && data.query_status !== "no_results") throw new Error(`URLhaus query status: ${String(data.query_status ?? "unknown")}.`);
  const items = endpoint === "host" ? (Array.isArray(data.urls) ? data.urls as Json[] : []) : endpoint === "payload" ? (Array.isArray(data.payloads) ? data.payloads as Json[] : data.query_status === "ok" ? [data] : []) : data.query_status === "ok" ? [data] : [];
  const findings = items.map((item) => finding(source, {
    id: String(item.id ?? item.sha256_hash ?? item.md5_hash ?? item.url ?? indicator), title: String(item.signature ?? item.threat ?? item.file_type ?? "Malware distribution URL"),
    detail: [item.url, item.url_status ? `status ${item.url_status}` : null, item.tags, item.sha256_hash].filter(Boolean).map((x) => Array.isArray(x) ? x.join(", ") : String(x)).join(" · "),
    observedAt: item.date_added ?? item.firstseen ?? data.firstseen ?? null, reference: item.urlhaus_reference ?? `https://urlhaus.abuse.ch/`, confidence: null,
  }));
  return result(source, findings, findings.length ? `${findings.length} matching URLhaus record(s).` : "No matching URLhaus record.");
}

const adapters: Record<SourceName, (indicator: string, type: IndicatorType) => Promise<SourceResult>> = {
  ThreatFox: async (indicator) => threatFox(indicator),
  AbuseIPDB: abuseIpDb,
  Pulsedive: pulsedive,
  URLhaus: urlhaus,
};

export async function enrichIndicator(indicator: string, type: IndicatorType) {
  const sources = await Promise.all(SOURCE_NAMES.map(async (source) => {
    const previous = cached(source, indicator);
    if (previous) return previous;
    try {
      return save(source, indicator, await adapters[source](indicator, type));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Source request failed.";
      return save(source, indicator, { source, state: "error", message: message.slice(0, 240), checkedAt: new Date().toISOString(), findings: [] });
    }
  }));
  return sources;
}

export function availableThreatSources() {
  return {
    ThreatFox: Boolean(process.env["THREATFOX_API_KEY"]),
    AbuseIPDB: Boolean(process.env["ABUSEIPDB_API_KEY"]),
    Pulsedive: Boolean(process.env["PULSEDIVE_API_KEY"]),
    URLhaus: Boolean(process.env["URLHAUS_API_KEY"]),
  };
}

