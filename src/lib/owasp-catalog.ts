export type Severity = "critical" | "high" | "medium" | "low" | "info";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export const SEVERITY_META: Record<
  Severity,
  { label: string; className: string; dot: string; weight: number }
> = {
  critical: {
    label: "Critical",
    className: "border-malicious/50 bg-malicious/10 text-malicious",
    dot: "bg-malicious",
    weight: 100,
  },
  high: {
    label: "High",
    className: "border-malicious/35 bg-malicious/5 text-malicious",
    dot: "bg-malicious",
    weight: 75,
  },
  medium: {
    label: "Medium",
    className: "border-caution/40 bg-caution/10 text-caution",
    dot: "bg-caution",
    weight: 45,
  },
  low: {
    label: "Low",
    className: "border-border bg-muted text-foreground",
    dot: "bg-muted-foreground",
    weight: 20,
  },
  info: {
    label: "Info",
    className: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    weight: 0,
  },
};

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  /** OWASP Top 10 (2021) category reference. */
  owasp: string;
  evidence: string;
  description: string;
  remediation: string;
  snippet?: { lang: string; code: string };
}

export interface CheckResult {
  checkId: string;
  label: string;
  ok: boolean;
  error: string | null;
  findings: Finding[];
  durationMs: number;
}

export interface CheckMeta {
  id: string;
  label: string;
  detail: string;
  owasp: string;
}

/**
 * Every check is non-destructive: single benign request, no exploitation,
 * no brute force, no state-changing verbs against the target.
 */
export const OWASP_CHECKS: CheckMeta[] = [
  {
    id: "transport",
    label: "Transport security & HTTPS redirect",
    detail: "Confirms plain HTTP redirects to HTTPS and that HSTS is enforced.",
    owasp: "A02:2021 Cryptographic Failures",
  },
  {
    id: "headers",
    label: "HTTP security headers",
    detail: "CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.",
    owasp: "A05:2021 Security Misconfiguration",
  },
  {
    id: "csp_quality",
    label: "Content-Security-Policy quality",
    detail: "Flags unsafe-inline, unsafe-eval, wildcard sources and missing frame-ancestors.",
    owasp: "A03:2021 Injection",
  },
  {
    id: "cors",
    label: "CORS configuration",
    detail: "Sends an untrusted Origin and checks for reflection or wildcard-with-credentials.",
    owasp: "A01:2021 Broken Access Control",
  },
  {
    id: "cookies",
    label: "Cookie attributes",
    detail: "Secure, HttpOnly and SameSite flags on every Set-Cookie.",
    owasp: "A05:2021 Security Misconfiguration",
  },
  {
    id: "fingerprint",
    label: "Technology disclosure",
    detail: "Server, X-Powered-By and framework version banners that aid attackers.",
    owasp: "A05:2021 Security Misconfiguration",
  },
  {
    id: "methods",
    label: "Allowed HTTP methods",
    detail: "Checks the advertised method list for TRACE, PUT and DELETE.",
    owasp: "A05:2021 Security Misconfiguration",
  },
  {
    id: "exposed_files",
    label: "Exposed sensitive files",
    detail: "Probes for /.env, /.git/HEAD and /server-status left in the web root.",
    owasp: "A05:2021 Security Misconfiguration",
  },
  {
    id: "sqli",
    label: "SQL injection error signatures",
    detail: "Single benign quote probe; looks only for leaked database error strings.",
    owasp: "A03:2021 Injection",
  },
  {
    id: "xss",
    label: "Reflected input handling",
    detail: "Sends a harmless marker and checks whether it is reflected unencoded.",
    owasp: "A03:2021 Injection",
  },
];

export function scoreFindings(findings: Finding[]): number {
  if (!findings.length) return 0;
  return Math.max(...findings.map((f) => SEVERITY_META[f.severity].weight));
}
