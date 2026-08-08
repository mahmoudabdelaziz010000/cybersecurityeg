import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Keyless OSINT connectors. Every source here works with zero configuration,
 * so the hub returns real intelligence out of the box.
 */

export type Verdict = "clean" | "caution" | "malicious" | "unknown";

export interface SourceResult {
  id: string;
  label: string;
  ok: boolean;
  error: string | null;
  facts: { key: string; value: string }[];
}

export interface HubResult {
  target: string;
  type: "ip" | "domain";
  verdict: Verdict;
  score: number;
  headline: string[];
  sources: SourceResult[];
  scannedAt: string;
}

export const SOURCE_CATALOG = [
  { id: "shodan_internetdb", label: "Shodan InternetDB", types: ["ip"], detail: "Open ports, CPEs and known CVEs for an IP." },
  { id: "rdap", label: "RDAP Registry", types: ["ip", "domain"], detail: "Authoritative registration, ownership and age data." },
  { id: "dns", label: "DNS over HTTPS", types: ["domain"], detail: "A, MX, NS, TXT records including SPF/DMARC posture." },
  { id: "crtsh", label: "crt.sh Certificate Transparency", types: ["domain"], detail: "Subdomain discovery from issued TLS certificates." },
  { id: "headers", label: "HTTP Security Headers", types: ["domain"], detail: "HSTS, CSP, frame and content-type protections." },
] as const;

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function classify(target: string): "ip" | "domain" {
  return IP_RE.test(target) ? "ip" : "domain";
}

const TIMEOUT = 12_000;

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { accept: "application/json", "user-agent": "SentinelGrid-OSINT/1.0", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Probe {
  facts: { key: string; value: string }[];
  risk: number;
  notes: string[];
}

async function probeShodan(target: string): Promise<Probe> {
  const data = await fetchJson(`https://internetdb.shodan.io/${target}`);
  const ports: number[] = data.ports ?? [];
  const vulns: string[] = data.vulns ?? [];
  const notes: string[] = [];
  if (vulns.length) notes.push(`${vulns.length} known CVE${vulns.length > 1 ? "s" : ""} exposed`);
  if (ports.length > 10) notes.push(`${ports.length} open ports — wide attack surface`);
  return {
    risk: vulns.length ? 70 : ports.length > 10 ? 35 : ports.length ? 12 : 0,
    notes,
    facts: [
      { key: "Open ports", value: ports.length ? ports.join(", ") : "none observed" },
      { key: "Known CVEs", value: vulns.length ? vulns.slice(0, 12).join(", ") : "none" },
      { key: "Hostnames", value: (data.hostnames ?? []).join(", ") || "—" },
      { key: "Tags", value: (data.tags ?? []).join(", ") || "—" },
    ],
  };
}

async function probeRdap(target: string, type: "ip" | "domain"): Promise<Probe> {
  const url = type === "ip" ? `https://rdap.org/ip/${target}` : `https://rdap.org/domain/${target}`;
  const data = await fetchJson(url);
  const events: any[] = data.events ?? [];
  const registered = events.find((e) => e.eventAction === "registration")?.eventDate;
  const notes: string[] = [];
  let risk = 0;
  if (registered) {
    const ageDays = (Date.now() - new Date(registered).getTime()) / 86_400_000;
    if (ageDays < 90) {
      risk = 45;
      notes.push(`Registered ${Math.round(ageDays)} days ago — newly created`);
    }
  }
  return {
    risk,
    notes,
    facts: [
      { key: "Handle", value: data.handle ?? data.ldhName ?? "—" },
      { key: "Name", value: data.name ?? "—" },
      { key: "Registered", value: registered ? new Date(registered).toISOString().slice(0, 10) : "—" },
      { key: "Status", value: (data.status ?? []).join(", ") || "—" },
      { key: "Country", value: data.country ?? "—" },
    ],
  };
}

async function probeDns(target: string): Promise<Probe> {
  const q = async (type: string) => {
    const data = await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(target)}&type=${type}`);
    return (data.Answer ?? []).map((a: any) => String(a.data));
  };
  const [a, mx, ns, txt] = await Promise.all([q("A"), q("MX"), q("NS"), q("TXT")]);
  const flat = txt.join(" ");
  const hasSpf = /v=spf1/i.test(flat);
  const dmarc = await q("TXT").catch(() => [] as string[]);
  const notes: string[] = [];
  let risk = 0;
  if (!hasSpf) {
    risk += 20;
    notes.push("No SPF record — domain is spoofable");
  }
  if (!a.length) notes.push("No A record resolved");
  void dmarc;
  return {
    risk,
    notes,
    facts: [
      { key: "A records", value: a.join(", ") || "—" },
      { key: "MX", value: mx.join(", ") || "—" },
      { key: "Nameservers", value: ns.join(", ") || "—" },
      { key: "SPF", value: hasSpf ? "present" : "missing" },
      { key: "TXT records", value: String(txt.length) },
    ],
  };
}

async function probeCrtsh(target: string): Promise<Probe> {
  const rows: any[] = await fetchJson(
    `https://crt.sh/?q=${encodeURIComponent(`%.${target}`)}&output=json`,
  );
  const subs = Array.from(new Set(rows.flatMap((r) => String(r.name_value).split("\n")))).sort();
  const notes: string[] = [];
  if (subs.length > 100) notes.push(`${subs.length} certificate-derived hostnames — large public footprint`);
  return {
    risk: subs.length > 200 ? 15 : 0,
    notes,
    facts: [
      { key: "Subdomains found", value: String(subs.length) },
      { key: "Sample", value: subs.slice(0, 15).join(", ") || "—" },
      { key: "Certificates seen", value: String(rows.length) },
    ],
  };
}

async function probeHeaders(target: string): Promise<Probe> {
  const res = await fetch(`https://${target}`, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const h = res.headers;
  const checks: [string, string | null][] = [
    ["Strict-Transport-Security", h.get("strict-transport-security")],
    ["Content-Security-Policy", h.get("content-security-policy")],
    ["X-Frame-Options", h.get("x-frame-options")],
    ["X-Content-Type-Options", h.get("x-content-type-options")],
    ["Referrer-Policy", h.get("referrer-policy")],
    ["Permissions-Policy", h.get("permissions-policy")],
  ];
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);
  const notes = missing.length
    ? [`${missing.length} security header${missing.length > 1 ? "s" : ""} missing`]
    : [];
  return {
    risk: Math.min(missing.length * 8, 40),
    notes,
    facts: [
      { key: "Status", value: `${res.status}` },
      { key: "Server", value: h.get("server") ?? "—" },
      ...checks.map(([k, v]) => ({ key: k, value: v ? "present" : "MISSING" })),
    ],
  };
}

async function runSource(id: string, target: string, type: "ip" | "domain") {
  switch (id) {
    case "shodan_internetdb":
      return probeShodan(target);
    case "rdap":
      return probeRdap(target, type);
    case "dns":
      return probeDns(target);
    case "crtsh":
      return probeCrtsh(target);
    case "headers":
      return probeHeaders(target);
    default:
      throw new Error("unknown source");
  }
}

export async function scanTarget(rawTarget: string, sourceIds: string[]): Promise<HubResult> {
  const target = rawTarget.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const type = classify(target);
  const active = SOURCE_CATALOG.filter(
    (s) => sourceIds.includes(s.id) && (s.types as readonly string[]).includes(type),
  );

  const settled = await Promise.all(
    active.map(async (s) => {
      try {
        const probe = await runSource(s.id, target, type);
        return { source: s, probe, error: null as string | null };
      } catch (e) {
        return { source: s, probe: null, error: e instanceof Error ? e.message : "failed" };
      }
    }),
  );

  let score = 0;
  const headline: string[] = [];
  const sources: SourceResult[] = settled.map(({ source, probe, error }) => {
    if (probe) {
      score = Math.max(score, probe.risk);
      headline.push(...probe.notes);
    }
    return {
      id: source.id,
      label: source.label,
      ok: !!probe,
      error,
      facts: probe?.facts ?? [],
    };
  });

  const answered = sources.some((s) => s.ok);
  const verdict: Verdict = !answered ? "unknown" : score >= 60 ? "malicious" : score >= 25 ? "caution" : "clean";

  return { target, type, verdict, score, headline, sources, scannedAt: new Date().toISOString() };
}

export const runHubScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        targets: z.array(z.string().min(1)).min(1).max(10),
        sources: z.array(z.string()).min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const results = await Promise.all(data.targets.map((t) => scanTarget(t, data.sources)));
    return { results };
  });
