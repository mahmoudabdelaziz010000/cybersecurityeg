import type { CheckResult, Finding, Severity } from "./owasp-catalog";
import { OWASP_CHECKS } from "./owasp-catalog";

const TIMEOUT = 12_000;
const UA = "SentinelGrid-OWASP/1.0 (passive security scanner)";

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http and https targets are supported");
  const host = url.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) throw new Error("Private and loopback addresses cannot be scanned");
  return url.toString();
}

async function req(
  url: string,
  init: RequestInit & { method?: string } = {},
): Promise<Response> {
  return fetch(url, {
    redirect: "manual",
    ...init,
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { "user-agent": UA, accept: "*/*", ...(init.headers ?? {}) },
  });
}

function finding(
  id: string,
  severity: Severity,
  title: string,
  owasp: string,
  evidence: string,
  description: string,
  remediation: string,
  snippet?: { lang: string; code: string },
): Finding {
  return {
    id,
    severity,
    title,
    owasp,
    evidence,
    description,
    remediation,
    ...(snippet ? { snippet } : {}),
  };
}

const HEADER_SNIPPET = {
  lang: "nginx",
  code: `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'none'; object-src 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`,
};

async function checkTransport(url: string): Promise<Finding[]> {
  const out: Finding[] = [];
  const u = new URL(url);
  const httpUrl = `http://${u.host}${u.pathname}`;

  let redirects = false;
  try {
    const res = await req(httpUrl);
    const loc = res.headers.get("location") ?? "";
    redirects = res.status >= 300 && res.status < 400 && /^https:/i.test(loc);
    if (!redirects) {
      out.push(
        finding(
          "no-https-redirect",
          "high",
          "Plain HTTP is served without redirecting to HTTPS",
          "A02:2021 Cryptographic Failures",
          `http://${u.host} responded ${res.status}${loc ? ` → ${loc}` : ""}`,
          "Traffic sent over HTTP can be read and modified in transit, including session cookies and credentials.",
          "Return a 301 redirect from every HTTP request to the HTTPS equivalent, then enable HSTS so browsers never try HTTP again.",
          {
            lang: "nginx",
            code: `server {\n  listen 80;\n  server_name ${u.hostname};\n  return 301 https://$host$request_uri;\n}`,
          },
        ),
      );
    }
  } catch {
    /* HTTP port closed is a good outcome */
  }

  const res = await req(u.toString(), { redirect: "follow" });
  const hsts = res.headers.get("strict-transport-security");
  if (!hsts) {
    out.push(
      finding(
        "missing-hsts",
        "medium",
        "Strict-Transport-Security header is missing",
        "A02:2021 Cryptographic Failures",
        "No Strict-Transport-Security response header",
        "Without HSTS, the first request of a session can be downgraded to HTTP and hijacked (SSL stripping).",
        "Send HSTS on every HTTPS response with a max-age of at least one year, includeSubDomains, and preload once you are confident every subdomain is HTTPS-only.",
        {
          lang: "http",
          code: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
        },
      ),
    );
  } else {
    const maxAge = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? 0);
    if (maxAge < 15_552_000) {
      out.push(
        finding(
          "weak-hsts",
          "low",
          "HSTS max-age is shorter than six months",
          "A02:2021 Cryptographic Failures",
          hsts,
          "A short max-age narrows the window in which browsers enforce HTTPS.",
          "Raise max-age to at least 31536000 (one year) and add includeSubDomains.",
          { lang: "http", code: `Strict-Transport-Security: max-age=31536000; includeSubDomains` },
        ),
      );
    }
  }
  return out;
}

const REQUIRED_HEADERS: {
  name: string;
  severity: Severity;
  title: string;
  description: string;
  remediation: string;
}[] = [
  {
    name: "content-security-policy",
    severity: "high",
    title: "Content-Security-Policy is missing",
    description:
      "Without a CSP, any injected script executes with full page privileges, turning a small XSS into full account takeover.",
    remediation:
      "Ship a restrictive default-src 'self' policy, add frame-ancestors 'none' and object-src 'none', then loosen deliberately per origin. Deploy in Report-Only mode first to find breakage.",
  },
  {
    name: "x-content-type-options",
    severity: "medium",
    title: "X-Content-Type-Options is missing",
    description:
      "Browsers may MIME-sniff a response and execute an uploaded file as script even when the declared type is harmless.",
    remediation: "Send X-Content-Type-Options: nosniff on every response.",
  },
  {
    name: "x-frame-options",
    severity: "medium",
    title: "Clickjacking protection is missing",
    description:
      "The page can be framed by a third-party site and overlaid to trick users into clicking authenticated actions.",
    remediation:
      "Send X-Frame-Options: DENY for legacy browsers and frame-ancestors 'none' in the CSP for modern ones.",
  },
  {
    name: "referrer-policy",
    severity: "low",
    title: "Referrer-Policy is missing",
    description:
      "Full URLs — including tokens embedded in paths or query strings — leak to third-party sites in the Referer header.",
    remediation: "Send Referrer-Policy: strict-origin-when-cross-origin.",
  },
  {
    name: "permissions-policy",
    severity: "info",
    title: "Permissions-Policy is missing",
    description:
      "Embedded content can request camera, microphone or geolocation permissions on your origin's behalf.",
    remediation:
      "Explicitly disable the browser features you do not use, e.g. camera=(), microphone=(), geolocation=().",
  },
];

async function checkHeaders(url: string): Promise<Finding[]> {
  const res = await req(url, { redirect: "follow" });
  return REQUIRED_HEADERS.filter((h) => !res.headers.get(h.name)).map((h) =>
    finding(
      `missing-${h.name}`,
      h.severity,
      h.title,
      "A05:2021 Security Misconfiguration",
      `Response ${res.status} had no ${h.name} header`,
      h.description,
      h.remediation,
      HEADER_SNIPPET,
    ),
  );
}

async function checkCspQuality(url: string): Promise<Finding[]> {
  const res = await req(url, { redirect: "follow" });
  const csp = res.headers.get("content-security-policy");
  if (!csp) return [];
  const out: Finding[] = [];
  const lower = csp.toLowerCase();

  if (lower.includes("'unsafe-inline'")) {
    out.push(
      finding(
        "csp-unsafe-inline",
        "high",
        "CSP allows 'unsafe-inline' scripts",
        "A03:2021 Injection",
        csp.slice(0, 240),
        "'unsafe-inline' defeats the main purpose of a CSP — injected inline <script> blocks still run.",
        "Remove 'unsafe-inline' and authorise your own scripts with a per-response nonce or a hash.",
        {
          lang: "http",
          code: `Content-Security-Policy: script-src 'self' 'nonce-{RANDOM_PER_REQUEST}'; object-src 'none'; base-uri 'self'`,
        },
      ),
    );
  }
  if (lower.includes("'unsafe-eval'")) {
    out.push(
      finding(
        "csp-unsafe-eval",
        "medium",
        "CSP allows 'unsafe-eval'",
        "A03:2021 Injection",
        csp.slice(0, 240),
        "eval() and Function() turn attacker-controlled strings into executable code.",
        "Drop 'unsafe-eval' and replace runtime code generation with static functions or a CSP-safe template engine.",
      ),
    );
  }
  if (/(default|script)-src[^;]*\*/i.test(csp)) {
    out.push(
      finding(
        "csp-wildcard",
        "medium",
        "CSP uses a wildcard script source",
        "A03:2021 Injection",
        csp.slice(0, 240),
        "A wildcard source lets any host serve executable script to your origin.",
        "Enumerate the exact CDN origins you depend on instead of using *.",
      ),
    );
  }
  if (!lower.includes("frame-ancestors")) {
    out.push(
      finding(
        "csp-no-frame-ancestors",
        "low",
        "CSP does not set frame-ancestors",
        "A05:2021 Security Misconfiguration",
        csp.slice(0, 240),
        "frame-ancestors is the modern clickjacking control and overrides X-Frame-Options.",
        "Add frame-ancestors 'none' (or the exact origins allowed to embed the page).",
      ),
    );
  }
  return out;
}

async function checkCors(url: string): Promise<Finding[]> {
  const evil = "https://sentinelgrid-cors-probe.example";
  const res = await req(url, { redirect: "follow", headers: { origin: evil } });
  const acao = res.headers.get("access-control-allow-origin");
  const creds = (res.headers.get("access-control-allow-credentials") ?? "").toLowerCase() === "true";
  const out: Finding[] = [];

  const snippet = {
    lang: "ts",
    code: `const ALLOWED = new Set(["https://app.example.com"]);\nconst origin = request.headers.get("origin");\nif (origin && ALLOWED.has(origin)) {\n  headers.set("Access-Control-Allow-Origin", origin);\n  headers.set("Access-Control-Allow-Credentials", "true");\n  headers.set("Vary", "Origin");\n}`,
  };

  if (acao === evil) {
    out.push(
      finding(
        "cors-origin-reflection",
        creds ? "critical" : "high",
        creds
          ? "CORS reflects any origin and allows credentials"
          : "CORS reflects any requesting origin",
        "A01:2021 Broken Access Control",
        `Access-Control-Allow-Origin: ${acao}${creds ? " with Allow-Credentials: true" : ""}`,
        creds
          ? "Any website a victim visits can read authenticated responses from this origin using the victim's cookies — a full cross-origin data breach."
          : "Origin reflection removes the same-origin protection for any response that does not require credentials.",
        "Validate the Origin header against an explicit allow-list before echoing it, always send Vary: Origin, and never combine credentials with a reflected or wildcard origin.",
        snippet,
      ),
    );
  } else if (acao === "*" && creds) {
    out.push(
      finding(
        "cors-wildcard-credentials",
        "high",
        "Wildcard CORS origin combined with credentials",
        "A01:2021 Broken Access Control",
        "Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true",
        "This combination is rejected by browsers but signals a misconfigured policy that often precedes an origin-reflection bug.",
        "Replace the wildcard with an explicit allow-list when credentials are required.",
        snippet,
      ),
    );
  } else if (acao === "*") {
    out.push(
      finding(
        "cors-wildcard",
        "info",
        "Responses are readable by any origin",
        "A01:2021 Broken Access Control",
        "Access-Control-Allow-Origin: *",
        "Acceptable for genuinely public content; a problem if any response on this host is user-specific.",
        "Scope the wildcard to public read-only endpoints only.",
        snippet,
      ),
    );
  }
  return out;
}

async function checkCookies(url: string): Promise<Finding[]> {
  const res = await req(url, { redirect: "follow" });
  const raw = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  const cookies = raw.length ? raw : res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : [];
  if (!cookies.length) return [];

  const out: Finding[] = [];
  const snippet = {
    lang: "http",
    code: `Set-Cookie: session=...; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`,
  };

  for (const c of cookies) {
    const name = c.split("=")[0]?.trim() ?? "cookie";
    const lower = c.toLowerCase();
    const missing: string[] = [];
    if (!lower.includes("secure")) missing.push("Secure");
    if (!lower.includes("httponly")) missing.push("HttpOnly");
    if (!lower.includes("samesite")) missing.push("SameSite");
    if (!missing.length) continue;
    out.push(
      finding(
        `cookie-${name}`,
        missing.includes("HttpOnly") ? "medium" : "low",
        `Cookie "${name}" is missing ${missing.join(", ")}`,
        "A05:2021 Security Misconfiguration",
        c.slice(0, 200),
        "HttpOnly stops JavaScript from stealing the cookie during an XSS, Secure keeps it off plain HTTP, and SameSite blunts CSRF.",
        "Set Secure, HttpOnly and SameSite=Lax (or Strict) on every session cookie. Use SameSite=None; Secure only for deliberate cross-site flows.",
        snippet,
      ),
    );
  }
  return out;
}

async function checkFingerprint(url: string): Promise<Finding[]> {
  const res = await req(url, { redirect: "follow" });
  const banners = ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version", "x-generator"];
  const found = banners
    .map((b) => [b, res.headers.get(b)] as const)
    .filter(([, v]) => v && /\d/.test(v));
  if (!found.length) return [];
  return [
    finding(
      "tech-disclosure",
      "low",
      "Server software and version are disclosed",
      "A05:2021 Security Misconfiguration",
      found.map(([k, v]) => `${k}: ${v}`).join(" · "),
      "Version banners let an attacker match your stack to a public exploit without probing you first.",
      "Strip or blank version headers at the edge. Most servers support this in one directive.",
      {
        lang: "nginx",
        code: `server_tokens off;\nproxy_hide_header X-Powered-By;\nmore_clear_headers "Server" "X-Powered-By";`,
      },
    ),
  ];
}

async function checkMethods(url: string): Promise<Finding[]> {
  const res = await req(url, { method: "OPTIONS" });
  const allow = res.headers.get("allow") ?? res.headers.get("access-control-allow-methods") ?? "";
  if (!allow) return [];
  const risky = ["TRACE", "TRACK", "PUT", "DELETE", "PATCH", "CONNECT"].filter((m) =>
    new RegExp(`\\b${m}\\b`, "i").test(allow),
  );
  if (!risky.length) return [];
  const hasTrace = risky.some((m) => m === "TRACE" || m === "TRACK");
  return [
    finding(
      "risky-methods",
      hasTrace ? "medium" : "low",
      `Server advertises ${risky.join(", ")}`,
      "A05:2021 Security Misconfiguration",
      `Allow: ${allow}`,
      hasTrace
        ? "TRACE enables cross-site tracing, which can echo cookies and auth headers back to an attacker's script."
        : "State-changing verbs exposed at the web-server level are frequently reachable without the checks your app performs.",
      "Disable TRACE/TRACK entirely and restrict write verbs to the API routes that need them, behind authentication.",
      {
        lang: "nginx",
        code: `if ($request_method ~ ^(TRACE|TRACK)$) {\n  return 405;\n}`,
      },
    ),
  ];
}

const SENSITIVE_PATHS = [
  { path: "/.env", label: "environment file", severity: "critical" as Severity },
  { path: "/.git/HEAD", label: "Git repository", severity: "high" as Severity },
  { path: "/server-status", label: "Apache status page", severity: "medium" as Severity },
  { path: "/.well-known/security.txt", label: "security.txt", severity: "info" as Severity },
];

async function checkExposedFiles(url: string): Promise<Finding[]> {
  const base = new URL(url);
  const out: Finding[] = [];
  await Promise.all(
    SENSITIVE_PATHS.map(async (p) => {
      try {
        const res = await req(new URL(p.path, base.origin).toString(), { redirect: "follow" });
        if (res.status !== 200) return;
        const body = (await res.text()).slice(0, 400);
        if (p.path === "/.well-known/security.txt") return; // present = good, no finding
        if (p.path === "/.git/HEAD" && !body.startsWith("ref:")) return;
        if (p.path === "/.env" && !/^\s*[A-Z0-9_]+\s*=/m.test(body)) return;
        out.push(
          finding(
            `exposed${p.path}`,
            p.severity,
            `${p.label} is publicly readable at ${p.path}`,
            "A05:2021 Security Misconfiguration",
            body.slice(0, 160).replace(/\s+/g, " "),
            "Deployment artefacts left in the web root routinely leak database credentials, API keys and full source history.",
            "Remove the file from the deployed artefact and block dotfile paths at the edge. Rotate every credential that was reachable.",
            {
              lang: "nginx",
              code: `location ~ /\\.(env|git|svn|ht) {\n  deny all;\n  return 404;\n}`,
            },
          ),
        );
      } catch {
        /* unreachable path is fine */
      }
    }),
  );
  if (!out.length) return [];
  return out;
}

const SQL_ERRORS = [
  /you have an error in your sql syntax/i,
  /warning:\s+mysql_/i,
  /unclosed quotation mark after the character string/i,
  /pg_query\(\)|PostgreSQL query failed/i,
  /SQLSTATE\[\w+\]/i,
  /ORA-\d{5}/,
  /sqlite3?\.OperationalError/i,
  /System\.Data\.SqlClient\.SqlException/i,
];

async function checkSqli(url: string): Promise<Finding[]> {
  const probe = new URL(url);
  probe.searchParams.set("sg_probe", "1'");
  const res = await req(probe.toString(), { redirect: "follow" });
  const body = (await res.text()).slice(0, 200_000);
  const hit = SQL_ERRORS.find((re) => re.test(body));
  if (!hit) return [];
  const excerpt = body.slice(Math.max(0, body.search(hit) - 60), body.search(hit) + 200);
  return [
    finding(
      "sqli-error-leak",
      "critical",
      "Database error leaked from an unsanitised parameter",
      "A03:2021 Injection",
      excerpt.replace(/\s+/g, " ").slice(0, 240),
      "A single quote in a query parameter reached the database engine. That means input is concatenated into SQL, which is the precondition for full SQL injection.",
      "Replace string concatenation with parameterised queries or an ORM everywhere, validate input types at the boundary, and turn off verbose database errors in production.",
      {
        lang: "ts",
        code: `// Vulnerable\nconst rows = await db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);\n\n// Fixed — the driver binds the value, it is never parsed as SQL\nconst rows = await db.query("SELECT * FROM users WHERE email = $1", [email]);`,
      },
    ),
  ];
}

async function checkXss(url: string): Promise<Finding[]> {
  const marker = "sg7xq<z>";
  const probe = new URL(url);
  probe.searchParams.set("sg_probe", marker);
  const res = await req(probe.toString(), { redirect: "follow" });
  const ctype = res.headers.get("content-type") ?? "";
  if (!/text\/html/i.test(ctype)) return [];
  const body = (await res.text()).slice(0, 200_000);
  if (!body.includes(marker)) return [];
  return [
    finding(
      "reflected-unencoded-input",
      "high",
      "Query input is reflected into HTML without encoding",
      "A03:2021 Injection",
      `The marker ${marker} appeared verbatim, angle brackets intact, in the HTML response.`,
      "Unencoded reflection of user input is the direct precursor to reflected cross-site scripting. An attacker can craft a link that runs script in your users' sessions.",
      "Context-encode all untrusted output (HTML entity encoding for markup, JavaScript string encoding inside scripts), prefer framework auto-escaping over raw HTML insertion, and layer a nonce-based CSP behind it.",
      {
        lang: "tsx",
        code: `// Vulnerable\n<div dangerouslySetInnerHTML={{ __html: query }} />\n\n// Fixed — React escapes text children automatically\n<div>{query}</div>\n\n// If raw HTML is genuinely required, sanitise first\nimport DOMPurify from "dompurify";\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(query) }} />`,
      },
    ),
  ];
}

/** Public TXT records for a name via DNS-over-HTTPS (no queries hit the target itself). */
async function txtRecords(name: string): Promise<string[]> {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
  return (json.Answer ?? [])
    .filter((a) => a.type === 16)
    .map((a) => a.data.replace(/^"|"$/g, ""));
}

async function checkEmailSec(url: string): Promise<Finding[]> {
  const host = new URL(url).hostname;
  const apex = host.replace(/^www\./, "");
  const out: Finding[] = [];

  const spf = (await txtRecords(apex)).filter((t) => /^v=spf1\b/i.test(t));
  if (!spf.length) {
    out.push(
      finding(
        "no-spf",
        "medium",
        "No SPF record — anyone can send email as this domain",
        "A05:2021 Security Misconfiguration",
        `No "v=spf1" TXT record on ${apex}`,
        "Without SPF, receiving mail servers have no statement of who may send mail for your domain, so phishing signed with your name often lands in the inbox.",
        "Publish an SPF record listing every host that legitimately sends mail for the domain, then verify with a test send.",
        { lang: "dns", code: `${apex}. 3600 IN TXT "v=spf1 include:_spf.example.com -all"` },
      ),
    );
  } else if (/\b[+~?]all\b/.test(spf[0])) {
    out.push(
      finding(
        "weak-spf",
        "medium",
        "SPF record does not enforce a fail policy",
        "A05:2021 Security Misconfiguration",
        spf[0],
        "SPF ending in +all or ?all permits every host on the internet to send mail as your domain — the record exists but protects nothing.",
        "End the record with -all (strict) or ~all (soft-fail) once the sending hosts are enumerated.",
      ),
    );
  }

  const dmarc = (await txtRecords(`_dmarc.${apex}`)).filter((t) => /^v=DMARC1\b/i.test(t));
  if (!dmarc.length) {
    out.push(
      finding(
        "no-dmarc",
        "medium",
        "No DMARC record — spoofed mail has no reporting or rejection",
        "A05:2021 Security Misconfiguration",
        `No "v=DMARC1" TXT record on _dmarc.${apex}`,
        "DMARC tells receiving servers what to do when SPF or DKIM fail and gives you reports about abuse of your domain.",
        "Publish a DMARC record. Start with p=none and rua reporting, then move to quarantine or reject once legitimate mail is aligned.",
        { lang: "dns", code: `_dmarc.${apex}. 3600 IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@${apex}"` },
      ),
    );
  } else if (/p=none\b/i.test(dmarc[0])) {
    out.push(
      finding(
        "dmarc-monitor-only",
        "low",
        "DMARC policy is monitor-only (p=none)",
        "A05:2021 Security Misconfiguration",
        dmarc[0],
        "With p=none, receiving servers still deliver spoofed mail; the record only reports it.",
        "Once reports confirm your legitimate mail aligns, raise the policy to quarantine or reject.",
      ),
    );
  }
  return out;
}

async function fetchHtml(url: string): Promise<{ html: string; ctype: string } | null> {
  const res = await req(url, { redirect: "follow" });
  const ctype = res.headers.get("content-type") ?? "";
  if (!/text\/html/i.test(ctype)) return null;
  return { html: (await res.text()).slice(0, 300_000), ctype };
}

async function checkMixedContent(url: string): Promise<Finding[]> {
  if (!url.startsWith("https://")) return [];
  const page = await fetchHtml(url);
  if (!page) return [];
  const refs = [
    ...new Set(
      [...page.html.matchAll(/(?:src|href)\s*=\s*["'](http:\/\/[^"']+)["']/gi)]
        .map((m) => m[1] ?? "")
        .filter((u) => !/w3\.org/i.test(u)),
    ),
  ].slice(0, 8);
  if (!refs.length) return [];
  return [
    finding(
      "mixed-content",
      refs.some((u) => /\.(js|mjs)(\?|$)/i.test(u)) ? "high" : "medium",
      "Insecure http:// resources are loaded on the HTTPS page",
      "A02:2021 Cryptographic Failures",
      refs.join(" · ").slice(0, 240),
      refs.some((u) => /\.(js|mjs)(\?|$)/i.test(u))
        ? "Scripts loaded over plain HTTP can be replaced in transit with attacker code — browsers block or warn on them, and the page's HTTPS padlock is undermined."
        : "Content fetched over plain HTTP can be modified in transit; browsers flag the page as not fully secure, eroding visitor trust.",
      "Load every subresource over HTTPS (or a protocol-relative CDN that supports it), then check the browser console for residual mixed-content warnings.",
    ),
  ];
}

async function checkSri(url: string): Promise<Finding[]> {
  const page = await fetchHtml(url);
  if (!page) return [];
  const self = new URL(url).hostname;
  const externals = [...page.html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map((m) => ({ tag: m[0], src: m[1] ?? "" }))
    .filter(({ src }) => /^https?:\/\//i.test(src) && new URL(src).hostname !== self)
    .filter(({ tag }) => !/\bintegrity\s*=/i.test(tag));
  if (!externals.length) return [];
  const sample = externals.slice(0, 5).map((e) => e.src.split("?")[0] ?? e.src).join(" · ");
  return [
    finding(
      "no-sri",
      "low",
      "Third-party scripts are loaded without an integrity hash",
      "A08:2021 Software and Data Integrity Failures",
      sample,
      "If a CDN or third-party script is compromised, the injected code runs with full privileges on your pages. Subresource Integrity pins the exact file you expect.",
      "Add integrity=\"sha384-...\" and crossorigin=\"anonymous\" to every external script you control the versioning of, or self-host critical dependencies.",
      {
        lang: "html",
        code: `<script src="https://cdn.example.com/lib.js"\n  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1vPzwwjPQFNMfkBTo"\n  crossorigin="anonymous"></script>`,
      },
    ),
  ];
}

const RUNNERS: Record<string, (url: string) => Promise<Finding[]>> = {
  transport: checkTransport,
  headers: checkHeaders,
  csp_quality: checkCspQuality,
  cors: checkCors,
  cookies: checkCookies,
  fingerprint: checkFingerprint,
  methods: checkMethods,
  exposed_files: checkExposedFiles,
  sqli: checkSqli,
  xss: checkXss,
  email_sec: checkEmailSec,
  mixed_content: checkMixedContent,
  sri: checkSri,
};

export async function runCheck(checkId: string, rawTarget: string): Promise<CheckResult> {
  const meta = OWASP_CHECKS.find((c) => c.id === checkId);
  if (!meta) throw new Error("Unknown check");
  const url = normalizeUrl(rawTarget);
  const started = Date.now();
  try {
    const findings = await RUNNERS[checkId]!(url);
    return {
      checkId,
      label: meta.label,
      ok: true,
      error: null,
      findings,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return {
      checkId,
      label: meta.label,
      ok: false,
      error: e instanceof Error ? e.message : "request failed",
      findings: [],
      durationMs: Date.now() - started,
    };
  }
}
