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

export interface SourceMeta {
  id: string;
  label: string;
  types: ("ip" | "domain")[];
  detail: string;
}

/** Every connector here is keyless — the hub returns real data with zero setup. */
export const SOURCE_CATALOG: SourceMeta[] = [
  {
    id: "shodan_internetdb",
    label: "Shodan InternetDB",
    types: ["ip"],
    detail: "Open ports, service fingerprints and known CVEs for an IP address.",
  },
  {
    id: "rdap",
    label: "RDAP Registry",
    types: ["ip", "domain"],
    detail: "Authoritative registration, ownership and domain-age data.",
  },
  {
    id: "dns",
    label: "DNS over HTTPS",
    types: ["domain"],
    detail: "A, MX, NS and TXT records including SPF spoofing posture.",
  },
  {
    id: "crtsh",
    label: "Certificate Transparency",
    types: ["domain"],
    detail: "Subdomain discovery from every publicly issued TLS certificate.",
  },
  {
    id: "headers",
    label: "HTTP Security Headers",
    types: ["domain"],
    detail: "HSTS, CSP, clickjacking and content-type protections.",
  },
];
