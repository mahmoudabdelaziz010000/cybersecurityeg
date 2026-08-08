import { SOURCE_CATALOG, type HubResult, type SourceResult, type Verdict } from "./osint-catalog";

const IP_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const TIMEOUT = 12_000;

function classify(target: string): "ip" | "domain" {
  return IP_RE.test(target) ? "ip" : "domain";
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { accept: "application/json", "user-agent": "SentinelGrid-OSINT/1.0" },
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
  if (vulns.length) notes.push(`${vulns.length} known CVE${vulns.length > 1 ? "s" : ""} exposed on this host`);
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
      notes.push(`Registered ${Math.round(ageDays)} days ago — newly created infrastructure`);
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
    const data = await fetchJson(
      `https://dns.google/resolve?name=${encodeURIComponent(target)}&type=${type}`,
    );
    return ((data.Answer ?? []) as any[]).map((a) => String(a.data));
  };
  const [a, mx, ns, txt] = await Promise.all([q("A"), q("MX"), q("NS"), q("TXT")]);
  const hasSpf = /v=spf1/i.test(txt.join(" "));
  const notes: string[] = [];
  let risk = 0;
  if (!hasSpf) {
    risk += 20;
    notes.push("No SPF record — the domain can be spoofed in email");
  }
  if (!a.length) notes.push("No A record resolved");
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
  return {
    risk: Math.min(missing.length * 8, 40),
    notes: missing.length ? [`${missing.length} security header${missing.length > 1 ? "s" : ""} missing`] : [],
    facts: [
      { key: "Status", value: String(res.status) },
      { key: "Server", value: h.get("server") ?? "—" },
      ...checks.map(([k, v]) => ({ key: k, value: v ? "present" : "MISSING" })),
    ],
  };
}

async function runSource(id: string, target: string, type: "ip" | "domain"): Promise<Probe> {
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

export function normalizeTarget(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export async function scanTarget(rawTarget: string, sourceIds: string[]): Promise<HubResult> {
  const target = normalizeTarget(rawTarget);
  const type = classify(target);
  const active = SOURCE_CATALOG.filter((s) => sourceIds.includes(s.id) && s.types.includes(type));

  const settled = await Promise.all(
    active.map(async (s) => {
      try {
        return { source: s, probe: await runSource(s.id, target, type), error: null as string | null };
      } catch (e) {
        return { source: s, probe: null, error: e instanceof Error ? e.message : "request failed" };
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
    return { id: source.id, label: source.label, ok: !!probe, error, facts: probe?.facts ?? [] };
  });

  const answered = sources.some((s) => s.ok);
  const verdict: Verdict = !answered
    ? "unknown"
    : score >= 60
      ? "malicious"
      : score >= 25
        ? "caution"
        : "clean";

  return { target, type, verdict, score, headline, sources, scannedAt: new Date().toISOString() };
}
