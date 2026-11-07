/**
 * Sophos integration (server only, read-only).
 *
 * - Sophos Firewall XML API:  POST https://<host>:<port>/webconsole/APIController  (form field `reqxml`)
 *   Only `<Get>` operations are ever built here; there is no Set/Remove code path.
 * - Sophos Central API:       OAuth2 client credentials -> /whoami/v1 -> /firewall/v1/firewalls
 *
 * Credentials come from server environment secrets only and are never returned to the browser.
 * Every value that leaves this module is control-character stripped, length capped and
 * secret-looking keys are redacted.
 */
import { SEVERITY_ORDER, lbl, type ConnectionState, type Finding, type SectionResult, type SophosSectionId, type SourceError, type SummaryItem, type TableData } from "./sophos-catalog";
import { asList, flatten, isObject, isOn, listOf, parseXml, path, pick, str, XmlParseError, type XmlObject, type XmlValue } from "./sophos-xml";
import type { Severity } from "./xdr-demo";
import { SAMPLE_CENTRAL, SAMPLE_FIREWALL } from "./sophos-sample";

/* ------------------------------------------------------------------ errors */

export class SophosError extends Error {
  readonly kind: SourceError["kind"];
  /** Fatal errors (auth, network, config) stop all further requests; entity errors do not. */
  readonly fatal: boolean;
  constructor(kind: SourceError["kind"], message: string, fatal = true) {
    super(message);
    this.name = "SophosError";
    this.kind = kind;
    this.fatal = fatal;
  }
}

function toSourceError(entity: string, error: unknown): SourceError {
  if (error instanceof SophosError) return { entity, kind: error.kind, message: error.message };
  return { entity, kind: "unreachable", message: "Unexpected error while contacting Sophos." };
}

/* ------------------------------------------------------------------ config */

export type Env = Record<string, string | undefined>;
export type FirewallConfig = { host: string; port: number; username: string; password: string; caPem?: string; apiVersion?: string };
export type CentralConfig = { clientId: string; clientSecret: string };
export type Deps = {
  fetch?: typeof fetch;
  /** Test seams for Sophos Central; production always uses the real hosts. */
  idUrl?: string;
  whoamiUrl?: string;
  centralHostPattern?: RegExp;
};

const HOST_PATTERN = /^(?:[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|\[[0-9A-Fa-f:]+\])$/;

function parseCa(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const pem = raw.replace(/\\n/g, "\n");
  if (pem.includes("-----BEGIN CERTIFICATE-----")) return pem;
  try {
    const decoded = atob(raw);
    if (decoded.includes("-----BEGIN CERTIFICATE-----")) return decoded;
  } catch {
    /* fall through */
  }
  throw new SophosError("config", "SOPHOS_FW_CA_CERT must be a PEM certificate (or its base64 encoding).");
}

/** `null` = nothing configured. Throws a config SophosError when only part of it is set or a value is malformed. */
export function readFirewallConfig(env: Env = process.env): FirewallConfig | null {
  const host = env["SOPHOS_FW_HOST"]?.trim();
  const username = env["SOPHOS_FW_USERNAME"]?.trim();
  const password = env["SOPHOS_FW_PASSWORD"];
  if (!host && !username && !password) return null;
  if (!host || !username || !password) throw new SophosError("config", "Set SOPHOS_FW_HOST, SOPHOS_FW_USERNAME and SOPHOS_FW_PASSWORD together.");
  if (!HOST_PATTERN.test(host)) throw new SophosError("config", "SOPHOS_FW_HOST must be a bare hostname or IP address (no scheme, port or path).");
  const portText = env["SOPHOS_FW_PORT"]?.trim();
  const port = portText ? Number(portText) : 4444;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new SophosError("config", "SOPHOS_FW_PORT must be a number between 1 and 65535.");
  const apiVersion = env["SOPHOS_FW_API_VERSION"]?.trim();
  if (apiVersion && !/^[0-9.]{1,12}$/.test(apiVersion)) throw new SophosError("config", "SOPHOS_FW_API_VERSION looks like 2200.1.");
  return { host, port, username, password, caPem: parseCa(env["SOPHOS_FW_CA_CERT"]), apiVersion: apiVersion || undefined };
}

export function readCentralConfig(env: Env = process.env): CentralConfig | null {
  const clientId = env["SOPHOS_CENTRAL_CLIENT_ID"]?.trim();
  const clientSecret = env["SOPHOS_CENTRAL_CLIENT_SECRET"];
  if (!clientId && !clientSecret) return null;
  if (!clientId || !clientSecret) throw new SophosError("config", "Set SOPHOS_CENTRAL_CLIENT_ID and SOPHOS_CENTRAL_CLIENT_SECRET together.");
  return { clientId, clientSecret };
}

/* ------------------------------------------------------------- sanitising */

/** Strip control characters (so untrusted text can never impersonate a label marker) and cap length. */
export function safe(value: string, max = 300): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);
}
const cell = (value: XmlValue | undefined): string => safe(str(value));
const lc = (value: XmlValue | undefined): string => str(value).trim().toLowerCase();
const onCell = (value: boolean | undefined): string => lbl(value === true ? "on" : value === false ? "off" : "unknown");

/* ------------------------------------------------------- firewall transport */

const TIMEOUT_MS = 15_000;
const MAX_BODY = 8 * 1024 * 1024;
const FORM = "application/x-www-form-urlencoded";

const xmlEscape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** The only request this module can build: login + one `<Get>`. */
export function buildGetRequest(cfg: Pick<FirewallConfig, "username" | "password" | "apiVersion">, entity: string): string {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(entity)) throw new SophosError("invalid", "Invalid entity name.", false);
  const version = cfg.apiVersion ? ` APIVersion="${xmlEscape(cfg.apiVersion)}"` : "";
  return `<Request${version}><Login><Username>${xmlEscape(cfg.username)}</Username><Password>${xmlEscape(cfg.password)}</Password></Login><Get><${entity}></${entity}></Get></Request>`;
}

function networkError(error: unknown): SophosError {
  const err = error as { name?: string; code?: string; cause?: { code?: string } } | undefined;
  const code = err?.code ?? err?.cause?.code ?? "";
  if (err?.name === "TimeoutError" || err?.name === "AbortError" || code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return new SophosError("timeout", "The firewall API did not answer in time.");
  }
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ALTNAME|ISSUER/i.test(code)) {
    return new SophosError("config", "The firewall TLS certificate is not trusted. Set SOPHOS_FW_CA_CERT to the firewall certificate (PEM) or install a trusted certificate.");
  }
  return new SophosError("unreachable", "Cannot reach the firewall API. Check the host and port, and that API access is allowed from this server's IP address.");
}

async function readCapped(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) throw new SophosError("invalid", "The firewall response is too large.");
  const reader = response.body?.getReader();
  if (!reader) return await response.text();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      throw new SophosError("invalid", "The firewall response is too large.");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/** Trust anchor = exactly the configured certificate; hostname matching is skipped because Sophos ships self-signed certs. */
async function postPinned(cfg: FirewallConfig, url: string, body: string): Promise<{ status: number; text: string }> {
  let https: typeof import("node:https");
  try {
    https = await import("node:https");
  } catch {
    throw new SophosError("config", "SOPHOS_FW_CA_CERT requires a Node.js runtime.");
  }
  const payload = new TextEncoder().encode(body);
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      { method: "POST", ca: cfg.caPem, checkServerIdentity: () => undefined, timeout: TIMEOUT_MS, headers: { "Content-Type": FORM, "Content-Length": String(payload.byteLength) } },
      (response) => {
        const chunks: Uint8Array[] = [];
        let size = 0;
        response.on("data", (chunk: Uint8Array) => {
          size += chunk.byteLength;
          if (size > MAX_BODY) request.destroy(new SophosError("invalid", "The firewall response is too large."));
          else chunks.push(chunk);
        });
        response.on("end", () => {
          const merged = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          resolve({ status: response.statusCode ?? 0, text: new TextDecoder().decode(merged) });
        });
        response.on("error", (error) => reject(networkError(error)));
      },
    );
    request.on("timeout", () => request.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    request.on("error", (error) => reject(error instanceof SophosError ? error : networkError(error)));
    request.end(payload);
  });
}

async function postForm(cfg: FirewallConfig, body: string, deps: Deps): Promise<{ status: number; text: string }> {
  const url = `https://${cfg.host}:${cfg.port}/webconsole/APIController`;
  if (cfg.caPem) return postPinned(cfg, url, body);
  try {
    const response = await (deps.fetch ?? fetch)(url, {
      method: "POST",
      headers: { "Content-Type": FORM, Accept: "application/xml, text/xml, */*" },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { status: response.status, text: await readCapped(response) };
  } catch (error) {
    throw error instanceof SophosError ? error : networkError(error);
  }
}

/** Fetch every record of one entity. */
export async function fetchEntity(cfg: FirewallConfig, entity: string, deps: Deps = {}): Promise<XmlObject[]> {
  const { status, text } = await postForm(cfg, `reqxml=${encodeURIComponent(buildGetRequest(cfg, entity))}`, deps);
  if (status === 401 || status === 403) throw new SophosError("auth", "The firewall rejected the API credentials.");
  if (status >= 300) throw new SophosError("unreachable", `The firewall API answered with HTTP ${status}. Check that API access is enabled (Backup & firmware > API).`);
  let response: XmlValue | undefined;
  try {
    response = parseXml(text)["Response"];
  } catch (error) {
    if (error instanceof XmlParseError) throw new SophosError("invalid", "The firewall answered with something that is not Sophos API XML. Check the host, port and that API access is enabled.");
    throw error;
  }
  if (!isObject(response)) throw new SophosError("invalid", "The firewall answered with something that is not Sophos API XML. Check the host, port and that API access is enabled.");
  const login = str(path(response, "Login", "status"));
  if (login && !/success/i.test(login)) {
    throw new SophosError("auth", "The firewall rejected the API credentials, or API access is not allowed from this server's IP address.");
  }
  const block = pick(response, entity);
  if (block === undefined) {
    const top = pick(response, "Status");
    const code = isObject(top) ? str(top["@code"]) : "";
    if (!code || code === "526") return [];
    throw new SophosError("unsupported", `The firewall reported status ${safe(code, 8)} for ${entity}.`, false);
  }
  const records: XmlObject[] = [];
  for (const record of asList(block)) {
    if (!isObject(record)) continue;
    const keys = Object.keys(record).filter((key) => !key.startsWith("@"));
    if (keys.length === 1 && keys[0]!.toLowerCase() === "status") {
      const code = str(pick(record["Status"], "@code"));
      if (!code || code === "526" || /zero|no record|not exist|no data/i.test(str(record["Status"]))) continue;
      throw new SophosError("unsupported", `The firewall reported status ${safe(code, 8)} for ${entity}.`, false);
    }
    records.push(record);
  }
  return records;
}

export type Collected = Record<string, { records: XmlObject[] } | { error: SourceError }>;

/**
 * Fetch several entities. The first request is a lone probe: a bad login or a wrong address
 * stops everything immediately, so a misconfiguration can never lock the admin account out.
 */
export async function collectEntities(cfg: FirewallConfig, entities: string[], deps: Deps = {}, concurrency = 3): Promise<{ data: Collected; fatal?: SourceError }> {
  const data: Collected = {};
  let fatal: SourceError | undefined;
  const run = async (entity: string) => {
    if (fatal) return;
    try {
      data[entity] = { records: await fetchEntity(cfg, entity, deps) };
    } catch (error) {
      const source = toSourceError(entity, error);
      if (error instanceof SophosError && error.fatal) fatal = { ...source, entity: "firewall" };
      else data[entity] = { error: source };
    }
  };
  const [first, ...rest] = entities;
  if (!first) return { data };
  await run(first);
  for (let i = 0; i < rest.length && !fatal; i += concurrency) await Promise.all(rest.slice(i, i + concurrency).map(run));
  return fatal ? { data, fatal } : { data };
}

/* ----------------------------------------------------------------- Central */

export type CentralFirewall = Record<string, unknown>;
export type CentralData = { tenantType: string; firewalls: CentralFirewall[] };

const CENTRAL_ID_URL = "https://id.sophos.com/api/v2/oauth2/token";
const CENTRAL_WHOAMI_URL = "https://api.central.sophos.com/whoami/v1";
const CENTRAL_HOST = /^https:\/\/api-[a-z0-9-]+\.central\.sophos\.com$/;
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function centralJson(deps: Deps, url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await (deps.fetch ?? fetch)(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const err = error as { name?: string };
    if (err?.name === "TimeoutError" || err?.name === "AbortError") throw new SophosError("timeout", "Sophos Central did not answer in time.");
    throw new SophosError("unreachable", "Cannot reach Sophos Central.");
  }
  if (response.status === 401 || response.status === 403 || (response.status === 400 && url.includes("oauth2"))) {
    throw new SophosError("auth", "Sophos Central rejected the API credentials.");
  }
  if (response.status === 429) throw new SophosError("rate", "Sophos Central rate limit reached. Try again in a minute.");
  if (!response.ok) throw new SophosError("unreachable", `Sophos Central answered with HTTP ${response.status}.`);
  try {
    return JSON.parse(await readCapped(response));
  } catch (error) {
    if (error instanceof SophosError) throw error;
    throw new SophosError("invalid", "Sophos Central returned an unreadable response.");
  }
}

const rec = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

export async function fetchCentral(cfg: CentralConfig, deps: Deps = {}): Promise<CentralData> {
  const cached = tokenCache.get(cfg.clientId);
  let token = cached && cached.expiresAt > Date.now() + 60_000 ? cached.token : undefined;
  if (!token) {
    const form = new URLSearchParams({ grant_type: "client_credentials", client_id: cfg.clientId, client_secret: cfg.clientSecret, scope: "token" });
    const body = rec(await centralJson(deps, deps.idUrl ?? CENTRAL_ID_URL, { method: "POST", headers: { "Content-Type": FORM, Accept: "application/json" }, body: form.toString() }));
    const accessToken = body["access_token"];
    const expiresIn = Number(body["expires_in"]);
    if (typeof accessToken !== "string" || !accessToken || !(expiresIn > 0)) throw new SophosError("invalid", "Sophos Central returned an unusable token.");
    token = accessToken;
    tokenCache.set(cfg.clientId, { token, expiresAt: Date.now() + expiresIn * 1000 });
  }
  const bearer = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const who = rec(await centralJson(deps, deps.whoamiUrl ?? CENTRAL_WHOAMI_URL, { method: "GET", headers: bearer }));
  const tenantType = typeof who["idType"] === "string" ? who["idType"] : "unknown";
  if (tenantType !== "tenant") {
    throw new SophosError("config", `These API credentials belong to a ${safe(tenantType, 20)}, not a single tenant. Create tenant-level credentials in Sophos Central (Global Settings > API Credentials Management).`);
  }
  const tenantId = typeof who["id"] === "string" ? who["id"] : "";
  const apiHost = String(rec(who["apiHosts"])["dataRegion"] ?? "").replace(/\/+$/, "");
  if (!tenantId || !(deps.centralHostPattern ?? CENTRAL_HOST).test(apiHost)) throw new SophosError("invalid", "Sophos Central returned an unexpected region host.");
  const headers = { ...bearer, "X-Tenant-ID": tenantId };
  const firewalls: CentralFirewall[] = [];
  let pages = 1;
  for (let page = 1; page <= Math.min(pages, 10); page++) {
    const query = new URLSearchParams({ page: String(page), pageSize: "100", ...(page === 1 ? { pageTotal: "true" } : {}) });
    const body = rec(await centralJson(deps, `${apiHost}/firewall/v1/firewalls?${query}`, { method: "GET", headers }));
    if (Array.isArray(body["items"])) firewalls.push(...body["items"].map(rec));
    if (page === 1) pages = Number(rec(body["pages"])["total"]) || 1;
  }
  return { tenantType, firewalls };
}

const jget = (value: unknown, ...names: string[]): unknown => names.reduce<unknown>((current, name) => rec(current)[name], value);
function jtext(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? safe(String(value)) : "";
}
function jflag(value: unknown): string {
  return typeof value === "boolean" ? onCell(value) : jtext(value) ? safe(jtext(value)) : lbl("unknown");
}

/* ---------------------------------------------------------------- sections */

const SECTION_ENTITIES: Record<SophosSectionId, string[]> = {
  overview: ["FirewallRule", "Interface", "UnicastRoute", "LocalServiceACL", "DoSSettings", "SpoofPrevention", "WebFilterPolicy", "ApplicationFilterPolicy", "SMTPPolicy"],
  basic: ["Interface", "Zone", "IPHost", "UnicastRoute", "DNS"],
  policies: ["FirewallRule", "NATRule"],
  misconfig: ["FirewallRule", "LocalServiceACL", "DoSSettings", "SpoofPrevention", "WebFilterPolicy", "ApplicationFilterPolicy", "SMTPPolicy"],
  dos: ["DoSSettings", "SpoofPrevention"],
  web: ["WebFilterPolicy"],
  apps: ["ApplicationFilterPolicy"],
  email: ["SMTPPolicy"],
  general: ["AdminSettings", "LocalServiceACL"],
  central: [],
};
const CENTRAL_SECTIONS = new Set<SophosSectionId>(["overview", "misconfig", "central"]);
export const sectionEntities = (section: SophosSectionId): string[] => SECTION_ENTITIES[section];
export const sectionUsesCentral = (section: SophosSectionId): boolean => CENTRAL_SECTIONS.has(section);

export type BuildInput = {
  firewall: { state: ConnectionState; data: Collected };
  central: { state: ConnectionState; data?: CentralData };
};

const recordsOf = (input: BuildInput, entity: string): XmlObject[] | null => {
  const entry = input.firewall.data[entity];
  return entry && "records" in entry ? entry.records : null;
};

function table(id: string, columns: string[], rows: string[][], cap = 200): TableData {
  return { id, columns, rows: rows.slice(0, cap), total: rows.length };
}
function kvTable(id: string, records: XmlObject[] | null, cap = 150): TableData | null {
  const first = records?.[0];
  if (!first) return null;
  return table(id, ["key", "value"], flatten(first).map(([key, value]) => [safe(key, 120), safe(value)]), cap);
}
const count = (id: string, value: number, tone?: SummaryItem["tone"]): SummaryItem => ({ id, value: String(value), ...(tone ? { tone } : {}) });
const zones = (np: XmlValue | undefined, tag: string) => listOf(pick(np, tag), "Zone");

function ruleParts(rule: XmlObject) {
  const policy = pick(rule, "NetworkPolicy");
  const np: XmlValue = isObject(policy) ? policy : rule;
  return {
    name: cell(pick(rule, "Name")) || "(unnamed)",
    enabled: isOn(pick(rule, "Status")),
    action: lc(pick(np, "Action")),
    log: isOn(pick(np, "LogTraffic")),
    srcZones: zones(np, "SourceZones"),
    dstZones: zones(np, "DestinationZones"),
    srcNets: listOf(pick(np, "SourceNetworks"), "Network"),
    dstNets: listOf(pick(np, "DestinationNetworks"), "Network"),
    services: listOf(pick(np, "Services"), "Service"),
  };
}
const isAny = (values: string[]) => values.length === 0 || values.some((value) => value.toLowerCase() === "any");
const names = (items: string[]) => (items.length ? items.map((item) => safe(item, 60)).join(", ") : "Any");

const categoryNames = (list: XmlValue | undefined, tag: string): string =>
  safe(
    asList(pick(list, tag))
      .map((entry) => (isObject(entry) ? str(pick(entry, "ID")) || str(entry) : str(entry)))
      .filter(Boolean)
      .join(", "),
  );

function buildBasic(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const interfaces = recordsOf(input, "Interface");
  const zonesRec = recordsOf(input, "Zone");
  const hosts = recordsOf(input, "IPHost");
  const routes = recordsOf(input, "UnicastRoute");
  if (interfaces) {
    out.summary.push(count("count.interfaces", interfaces.length));
    out.tables.push(table("table.interfaces", ["name", "zone", "ipv4", "netmask", "status"], interfaces.map((i) => [
      cell(pick(i, "Name")), cell(pick(i, "NetworkZone", "Zone")),
      cell(pick(i, "IPAddress")) || (lc(pick(i, "IPv4Configuration")) === "dhcp" ? "DHCP" : ""), cell(pick(i, "Netmask")), cell(pick(i, "Status")),
    ])));
  }
  if (zonesRec) {
    out.summary.push(count("count.zones", zonesRec.length));
    out.tables.push(table("table.zones", ["name", "type"], zonesRec.map((z) => [cell(pick(z, "Name")), cell(pick(z, "Type"))])));
  }
  if (hosts) {
    out.summary.push(count("count.hosts", hosts.length));
    out.tables.push(table("table.hosts", ["name", "family", "type", "address"], hosts.map((h) => {
      const type = cell(pick(h, "HostType"));
      const base = cell(pick(h, "IPAddress"));
      const address = /range/i.test(type) ? `${cell(pick(h, "StartIPAddress"))} - ${cell(pick(h, "EndIPAddress"))}` : /list/i.test(type) ? cell(pick(h, "ListOfIPAddresses")) : /network/i.test(type) && base ? `${base}/${cell(pick(h, "Subnet"))}` : base;
      return [cell(pick(h, "Name")), cell(pick(h, "IPFamily")), type, address];
    })));
  }
  if (routes) {
    out.summary.push(count("count.routes", routes.length));
    out.tables.push(table("table.routes", ["destination", "gateway", "interface", "distance", "status"], routes.map((r) => [
      `${cell(pick(r, "DestinationIP"))}/${cell(pick(r, "Netmask"))}`,
      isOn(pick(r, "Blackhole")) === true ? "Blackhole" : cell(pick(r, "Gateway")), cell(pick(r, "Interface")),
      cell(pick(r, "AdministrativeDistance", "Distance")), cell(pick(r, "Status")),
    ])));
  }
  const dns = kvTable("table.dns", recordsOf(input, "DNS"));
  if (dns) out.tables.push(dns);
  return out;
}

function buildPolicies(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const rules = recordsOf(input, "FirewallRule");
  if (rules) {
    const parts = rules.map(ruleParts);
    out.summary.push(count("count.rules", parts.length), count("count.rulesEnabled", parts.filter((p) => p.enabled !== false).length));
    out.summary.push(count("count.accept", parts.filter((p) => p.action === "accept").length), count("count.drop", parts.filter((p) => p.action === "drop" || p.action === "reject").length));
    out.tables.push(table("table.rules", ["position", "name", "status", "action", "source", "destination", "services", "log"], parts.map((p, index) => [
      String(index + 1), p.name, onCell(p.enabled), safe(p.action), `${names(p.srcZones)} · ${names(p.srcNets)}`, `${names(p.dstZones)} · ${names(p.dstNets)}`, names(p.services), onCell(p.log),
    ])));
  }
  const nat = recordsOf(input, "NATRule");
  if (nat) {
    out.summary.push(count("count.nat", nat.length));
    out.tables.push(table("table.nat", ["position", "name", "status"], nat.map((n, index) => [String(index + 1), cell(pick(n, "Name")), onCell(isOn(pick(n, "Status")))])));
  }
  return out;
}

const FLOODS = [
  { tag: "SYNFlood", label: "dos.syn" },
  { tag: "UDPFlood", label: "dos.udp" },
  { tag: "TCPFlood", label: "dos.tcp" },
  { tag: "ICMPFlood", label: "dos.icmp" },
] as const;
const HARDENING = [
  { tag: "DroppedSourceRoutedPackets", label: "dos.sourceRouted" },
  { tag: "DisableICMPRedirectPacket", label: "dos.icmpRedirect" },
  { tag: "DisableARPFlooding", label: "dos.arpFlood" },
] as const;

function buildDos(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const settings = recordsOf(input, "DoSSettings")?.[0];
  if (settings) {
    const flood: string[][] = [];
    let active = 0;
    for (const { tag, label } of FLOODS) {
      const src = isOn(path(settings, tag, "Source", "ApplyFlag"));
      const dst = isOn(path(settings, tag, "Destination", "ApplyFlag"));
      if (src || dst) active += 1;
      flood.push([lbl(label), lbl("dir.source"), cell(path(settings, tag, "Source", "PacketRatePerSource")), cell(path(settings, tag, "Source", "BurstRatePerSource")), onCell(src)]);
      flood.push([lbl(label), lbl("dir.destination"), cell(path(settings, tag, "Destination", "PacketRatePerDestination")), cell(path(settings, tag, "Destination", "BurstRatePerDestination")), onCell(dst)]);
    }
    out.summary.push({ id: "dos.floodOn", value: `${active}/${FLOODS.length}`, tone: active === FLOODS.length ? "ok" : "warn" });
    out.tables.push(table("table.dosFlood", ["type", "direction", "packetRate", "burstRate", "enabled"], flood));
    out.tables.push(table("table.dosOther", ["protection", "enabled"], HARDENING.map(({ tag, label }) => [lbl(label), onCell(isOn(path(settings, tag, "Destination", "ApplyFlag")))])));
  }
  const spoof = recordsOf(input, "SpoofPrevention")?.[0];
  if (spoof) {
    const enabled = isOn(pick(spoof, "SpoofPrevention"));
    out.summary.push({ id: "dos.spoof", value: lbl(enabled === true ? "on" : enabled === false ? "off" : "unknown"), tone: enabled === true ? "ok" : enabled === false ? "bad" : "info" });
    const zoneRow = (id: string, tag: string) => [lbl(id), safe(listOf(path(spoof, tag, "EnableOnZone"), "Zone").join(", ")) || "—"];
    out.tables.push(table("table.spoof", ["setting", "value"], [
      [lbl("spoof.enabled"), onCell(enabled)], [lbl("spoof.restrictUnknown"), onCell(isOn(pick(spoof, "RestrictUnknownIPOnTrustedMAC")))],
      zoneRow("spoof.ipZones", "IPSpoofing"), zoneRow("spoof.macZones", "MACFilter"), zoneRow("spoof.ipMacZones", "IPMACFilter"),
    ]));
  }
  return out;
}

function buildWeb(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const policies = recordsOf(input, "WebFilterPolicy");
  if (!policies) return out;
  const ruleRows: string[][] = [];
  const rows = policies.map((p) => {
    const rules = asList(path(p, "RuleList", "Rule"));
    const denied = rules.filter((r) => /deny|block/i.test(`${str(pick(r, "HTTPAction"))} ${str(pick(r, "HTTPSAction"))}`)).length;
    for (const r of rules) {
      ruleRows.push([cell(pick(p, "Name")), categoryNames(pick(r, "CategoryList"), "Category"), cell(pick(r, "HTTPAction")), cell(pick(r, "HTTPSAction")), cell(pick(r, "Schedule")), onCell(isOn(pick(r, "PolicyRuleEnabled")))]);
    }
    return [cell(pick(p, "Name")), cell(pick(p, "DefaultAction")), String(rules.length), String(denied), onCell(isOn(pick(p, "EnforceSafeSearch"))), onCell(isOn(pick(p, "YoutubeFilterEnabled")))];
  });
  out.summary.push(count("count.webPolicies", policies.length));
  out.tables.push(table("table.webPolicies", ["name", "defaultAction", "rules", "blocking", "safeSearch", "youtube"], rows));
  out.tables.push(table("table.webRules", ["policy", "categories", "http", "https", "schedule", "enabled"], ruleRows));
  return out;
}

function buildApps(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const policies = recordsOf(input, "ApplicationFilterPolicy");
  if (!policies) return out;
  const ruleRows: string[][] = [];
  const rows = policies.map((p) => {
    const rules = asList(path(p, "RuleList", "Rule"));
    const denied = rules.filter((r) => lc(pick(r, "Action")) === "deny").length;
    for (const r of rules) {
      ruleRows.push([cell(pick(p, "Name")), categoryNames(pick(r, "CategoryList"), "Category"), categoryNames(pick(r, "RiskList"), "Risk"), cell(pick(r, "Action")), cell(pick(r, "Schedule"))]);
    }
    return [cell(pick(p, "Name")), cell(pick(p, "DefaultAction")), String(rules.length), String(denied), onCell(isOn(pick(p, "MicroAppSupport")))];
  });
  out.summary.push(count("count.appPolicies", policies.length));
  out.tables.push(table("table.appPolicies", ["name", "defaultAction", "rules", "blocking", "microApps"], rows));
  out.tables.push(table("table.appRules", ["policy", "categories", "risk", "action", "schedule"], ruleRows));
  return out;
}

function buildEmail(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const policies = recordsOf(input, "SMTPPolicy");
  if (!policies) return out;
  out.summary.push(count("count.smtpPolicies", policies.length));
  out.tables.push(table("table.smtp", ["name", "domains", "spam", "malware", "zeroDay", "fileFilter", "dlp", "action"], policies.map((p) => [
    cell(pick(p, "Name")), safe(listOf(pick(p, "DomainList"), "DomainName").join(", ")),
    onCell(isOn(path(p, "SpamProtection", "SpamProtectionStatus"))), onCell(isOn(path(p, "MalwareProtection", "MalwareProtectionStatus"))),
    onCell(isOn(path(p, "MalwareProtection", "ZeroDayProtection"))), onCell(isOn(path(p, "FiletypeFilter", "FiletypeFilterStatus"))),
    onCell(isOn(path(p, "DataProtection", "DataProtectionStatus"))), cell(pick(p, "Action")),
  ])));
  return out;
}

function buildGeneral(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const admin = kvTable("table.admin", recordsOf(input, "AdminSettings"));
  if (admin) out.tables.push(admin);
  const acl = recordsOf(input, "LocalServiceACL");
  if (acl) {
    out.summary.push(count("count.accessRules", acl.length));
    out.tables.push(table("table.access", ["name", "zone", "hosts", "services", "action"], acl.map((a) => [
      cell(pick(a, "RuleName", "Name")), cell(pick(a, "SourceZone")), names(listOf(pick(a, "Hosts"), "Host")), names(listOf(pick(a, "Services"), "Service")), cell(pick(a, "Action")),
    ])));
  }
  return out;
}

function buildCentral(input: BuildInput) {
  const out = { summary: [] as SummaryItem[], tables: [] as TableData[] };
  const data = input.central.data;
  if (!data) return out;
  const down = data.firewalls.filter((f) => jget(f, "status", "connected") === false).length;
  out.summary.push({ id: "central.tenantType", value: safe(data.tenantType, 30) }, count("central.firewalls", data.firewalls.length), count("central.disconnected", down, down ? "warn" : "ok"));
  out.tables.push(table("table.centralFirewalls", ["name", "hostname", "serial", "model", "firmware", "connectedCol", "managing", "health", "changed"], data.firewalls.map((f) => [
    jtext(f["name"]), jtext(f["hostname"]), jtext(f["serialNumber"]), jtext(f["model"]), jtext(f["firmwareVersion"]),
    jflag(jget(f, "status", "connected")), jflag(jget(f, "status", "managing")), jtext(f["healthStatus"]) || jtext(jget(f, "status", "health")), jtext(f["stateChangedAt"]),
  ])));
  return out;
}

/* ------------------------------------------------------------ misconfiguration */

export function analyze(input: BuildInput): Finding[] {
  const found = new Map<string, Finding>();
  const push = (rule: string, severity: Severity, subject: string) => {
    const entry = found.get(rule) ?? { rule, severity, subjects: [], total: 0 };
    entry.total += 1;
    if (entry.subjects.length < 12) entry.subjects.push(subject);
    found.set(rule, entry);
  };
  /** Subject text that came from the firewall: always sanitised. */
  const add = (rule: string, severity: Severity, subject: string) => push(rule, severity, safe(subject, 120));
  /** Subject that is one of our own label ids (translated by the UI). */
  const addLabel = (rule: string, severity: Severity, labelId: string) => push(rule, severity, lbl(labelId));

  for (const rule of recordsOf(input, "FirewallRule") ?? []) {
    const p = ruleParts(rule);
    if (p.enabled === false) {
      add("fw-disabled-rules", "Info", p.name);
      continue;
    }
    if (p.action !== "accept") continue;
    if (isAny(p.srcZones) && isAny(p.dstZones) && isAny(p.srcNets) && isAny(p.dstNets) && isAny(p.services)) add("fw-any-any-accept", "Critical", p.name);
    else if (p.srcZones.some((zone) => zone.toLowerCase() === "wan") && isAny(p.services)) add("fw-wan-accept-any-service", "High", p.name);
    if (p.log === false) add("fw-accept-no-log", "Medium", p.name);
  }

  for (const acl of recordsOf(input, "LocalServiceACL") ?? []) {
    const action = lc(pick(acl, "Action"));
    if (action && action !== "accept") continue;
    const zone = lc(pick(acl, "SourceZone"));
    if (zone !== "wan" && zone !== "any") continue;
    const services = listOf(pick(acl, "Services"), "Service").map((service) => service.toLowerCase());
    const hosts = listOf(pick(acl, "Hosts"), "Host");
    const open = hosts.length === 0 || hosts.some((host) => host.toLowerCase() === "any");
    const label = `${cell(pick(acl, "RuleName", "Name")) || "(unnamed)"} (${services.join(", ")})`;
    if (services.some((service) => service === "https" || service === "ssh")) add(open ? "admin-wan-open" : "admin-wan-restricted", open ? "Critical" : "Medium", label);
    if (open && services.some((service) => service === "dns" || service === "snmp")) add("service-wan-exposed", "Medium", label);
  }

  const dos = recordsOf(input, "DoSSettings")?.[0];
  if (dos) {
    for (const { tag, label } of FLOODS) {
      const src = isOn(path(dos, tag, "Source", "ApplyFlag"));
      const dst = isOn(path(dos, tag, "Destination", "ApplyFlag"));
      if (src === undefined && dst === undefined) continue;
      if (!src && !dst) addLabel("dos-flood-off", "Medium", label);
      else if (!src || !dst) addLabel("dos-flood-partial", "Low", label);
    }
    for (const { tag, label } of HARDENING) if (isOn(path(dos, tag, "Destination", "ApplyFlag")) === false) addLabel("dos-hardening-off", "Low", label);
  }
  const spoof = recordsOf(input, "SpoofPrevention")?.[0];
  if (spoof) {
    const enabled = isOn(pick(spoof, "SpoofPrevention"));
    if (enabled === false) addLabel("spoof-off", "Medium", "spoof.enabled");
    else if (enabled === true && pick(spoof, "IPSpoofing") !== undefined && listOf(path(spoof, "IPSpoofing", "EnableOnZone"), "Zone").length === 0) addLabel("spoof-no-zones", "Low", "spoof.ipZones");
  }

  for (const policy of recordsOf(input, "WebFilterPolicy") ?? []) {
    const name = cell(pick(policy, "Name"));
    if (/^allow all$/i.test(name) || lc(pick(policy, "DefaultAction")) !== "allow" || pick(policy, "RuleList") === undefined) continue;
    const denies = asList(path(policy, "RuleList", "Rule")).filter((r) => /deny|block/i.test(`${str(pick(r, "HTTPAction"))} ${str(pick(r, "HTTPSAction"))}`));
    if (!denies.length) add("web-no-blocking", "Low", name);
  }
  for (const policy of recordsOf(input, "ApplicationFilterPolicy") ?? []) {
    const name = cell(pick(policy, "Name"));
    if (/^allow all$/i.test(name) || lc(pick(policy, "DefaultAction")) !== "allow" || pick(policy, "RuleList") === undefined) continue;
    if (!asList(path(policy, "RuleList", "Rule")).some((r) => lc(pick(r, "Action")) === "deny")) add("app-no-blocking", "Low", name);
  }

  for (const policy of recordsOf(input, "SMTPPolicy") ?? []) {
    const name = cell(pick(policy, "Name")) || "(unnamed)";
    const spam = isOn(path(policy, "SpamProtection", "SpamProtectionStatus"));
    const malware = isOn(path(policy, "MalwareProtection", "MalwareProtectionStatus"));
    if (spam === false) add("email-spam-off", "Medium", name);
    if (malware === false) add("email-malware-off", "High", name);
    if (malware === true && isOn(path(policy, "MalwareProtection", "ZeroDayProtection")) === false) add("email-zeroday-off", "Low", name);
    if (spam === true && /^off/i.test(str(path(policy, "SpamProtection", "RecipientVerification")).trim())) add("email-recipient-verification-off", "Low", name);
  }

  for (const firewall of input.central.data?.firewalls ?? []) {
    if (jget(firewall, "status", "connected") === false) add("central-disconnected", "Medium", jtext(firewall["name"]) || jtext(firewall["hostname"]) || "(unnamed)");
  }

  return [...found.values()].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.rule.localeCompare(b.rule));
}

function severitySummary(findings: Finding[]): SummaryItem[] {
  const total = (...levels: Severity[]) => findings.filter((f) => levels.includes(f.severity)).reduce((sum, f) => sum + f.total, 0);
  const critical = total("Critical");
  const high = total("High");
  return [
    count("count.findings", total("Critical", "High", "Medium", "Low", "Info")),
    count("count.critical", critical, critical ? "bad" : "ok"),
    count("count.high", high, high ? "bad" : "ok"),
    count("count.medium", total("Medium"), total("Medium") ? "warn" : "ok"),
    count("count.low", total("Low", "Info"), "info"),
  ];
}

/** Pure: turn collected API data into the section the UI renders. */
export function buildSection(section: SophosSectionId, input: BuildInput): Omit<SectionResult, "fetchedAt" | "connections" | "errors"> {
  let body: { summary: SummaryItem[]; tables: TableData[] } = { summary: [], tables: [] };
  let findings: Finding[] = [];
  switch (section) {
    case "basic": body = buildBasic(input); break;
    case "policies": body = buildPolicies(input); break;
    case "dos": body = buildDos(input); break;
    case "web": body = buildWeb(input); break;
    case "apps": body = buildApps(input); break;
    case "email": body = buildEmail(input); break;
    case "general": body = buildGeneral(input); break;
    case "central": body = buildCentral(input); break;
    case "misconfig":
      findings = analyze(input);
      body = { summary: severitySummary(findings), tables: [] };
      break;
    case "overview": {
      findings = analyze(input);
      const rules = recordsOf(input, "FirewallRule");
      const summary: SummaryItem[] = [
        { id: "fw.connection", value: lbl(input.firewall.state === "ok" ? "connected" : input.firewall.state === "error" ? "error" : "unconfigured"), tone: input.firewall.state === "ok" ? "ok" : input.firewall.state === "error" ? "bad" : "info" },
        { id: "central.connection", value: lbl(input.central.state === "ok" ? "connected" : input.central.state === "error" ? "error" : "unconfigured"), tone: input.central.state === "ok" ? "ok" : input.central.state === "error" ? "bad" : "info" },
      ];
      if (rules) summary.push(count("count.rules", rules.length));
      const interfaces = recordsOf(input, "Interface");
      if (interfaces) summary.push(count("count.interfaces", interfaces.length));
      const routes = recordsOf(input, "UnicastRoute");
      if (routes) summary.push(count("count.routes", routes.length));
      body = { summary: [...summary, ...severitySummary(findings)], tables: [] };
      break;
    }
  }
  return { section, summary: body.summary, tables: body.tables, findings };
}

/* ------------------------------------------------------------------- loader */

const ENTITY_TTL = 30_000;
const CENTRAL_TTL = 60_000;
const FATAL_TTL = 60_000;
const MIN_REFRESH = 5_000;
const entityCache = new Map<string, { at: number; value: Collected[string] }>();
let fatalCache: { at: number; value: SourceError } | null = null;
let centralCache: { at: number; value: CentralData } | null = null;
let centralFail: { at: number; value: SourceError } | null = null;
const inflight = new Map<string, Promise<unknown>>();

export function resetSophosCaches(): void {
  entityCache.clear();
  tokenCache.clear();
  inflight.clear();
  fatalCache = null;
  centralCache = null;
  centralFail = null;
}

async function shared<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = run().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

async function firewallData(cfg: FirewallConfig, entities: string[], fresh: boolean, deps: Deps): Promise<{ data: Collected; fatal?: SourceError }> {
  const now = Date.now();
  // Even a manual refresh honours a cached fatal error: repeated bad logins can lock the admin account.
  if (fatalCache && now - fatalCache.at < FATAL_TTL) return { data: {}, fatal: fatalCache.value };
  const ttl = fresh ? MIN_REFRESH : ENTITY_TTL;
  const data: Collected = {};
  const missing: string[] = [];
  for (const entity of entities) {
    const hit = entityCache.get(entity);
    if (hit && now - hit.at < ttl) data[entity] = hit.value;
    else missing.push(entity);
  }
  if (missing.length) {
    const got = await shared(`fw:${missing.join(",")}`, () => collectEntities(cfg, missing, deps));
    if (got.fatal) {
      fatalCache = { at: Date.now(), value: got.fatal };
      return { data, fatal: got.fatal };
    }
    fatalCache = null;
    for (const [entity, value] of Object.entries(got.data)) {
      entityCache.set(entity, { at: Date.now(), value });
      data[entity] = value;
    }
  }
  return { data };
}

async function centralData(cfg: CentralConfig, fresh: boolean, deps: Deps): Promise<{ data?: CentralData; error?: SourceError }> {
  const now = Date.now();
  if (centralFail && now - centralFail.at < FATAL_TTL) return { error: centralFail.value };
  if (centralCache && now - centralCache.at < (fresh ? MIN_REFRESH : CENTRAL_TTL)) return { data: centralCache.value };
  try {
    const data = await shared("central", () => fetchCentral(cfg, deps));
    centralCache = { at: Date.now(), value: data };
    centralFail = null;
    return { data };
  } catch (error) {
    const source = toSourceError("central", error);
    centralFail = { at: Date.now(), value: source };
    return { error: source };
  }
}

export type LoadOptions = { fresh?: boolean; env?: Env; deps?: Deps };

export async function loadSection(section: SophosSectionId, options: LoadOptions = {}): Promise<SectionResult> {
  const env = options.env ?? process.env;
  const deps = options.deps ?? {};
  const fresh = options.fresh ?? false;
  const errors: SourceError[] = [];
  const entities = SECTION_ENTITIES[section];
  const wantsFirewall = entities.length > 0;
  const wantsCentral = CENTRAL_SECTIONS.has(section);

  let firewallState: ConnectionState = "skipped";
  let firewall: { data: Collected } = { data: {} };
  if (wantsFirewall) {
    try {
      const cfg = readFirewallConfig(env);
      if (!cfg) firewallState = "unconfigured";
      else {
        const got = await firewallData(cfg, entities, fresh, deps);
        firewall = { data: got.data };
        firewallState = got.fatal ? "error" : "ok";
        if (got.fatal) errors.push(got.fatal);
      }
    } catch (error) {
      firewallState = "error";
      errors.push({ ...toSourceError("firewall", error), entity: "firewall" });
    }
    for (const [entity, entry] of Object.entries(firewall.data)) if ("error" in entry) errors.push({ ...entry.error, entity });
  }

  let centralState: ConnectionState = "skipped";
  let central: CentralData | undefined;
  if (wantsCentral) {
    try {
      const cfg = readCentralConfig(env);
      if (!cfg) centralState = "unconfigured";
      else {
        const got = await centralData(cfg, fresh, deps);
        central = got.data;
        centralState = got.error ? "error" : "ok";
        if (got.error) errors.push(got.error);
      }
    } catch (error) {
      centralState = "error";
      errors.push({ ...toSourceError("central", error), entity: "central" });
    }
  }

  // Fallback: only a source that is not configured at all shows sample data. Real errors stay visible.
  const sample: ("firewall" | "central")[] = [];
  if (wantsFirewall && firewallState === "unconfigured") {
    firewall = { data: Object.fromEntries(entities.flatMap((entity) => (SAMPLE_FIREWALL[entity] ? [[entity, SAMPLE_FIREWALL[entity]!]] : []))) };
    sample.push("firewall");
  }
  if (wantsCentral && centralState === "unconfigured") {
    central = SAMPLE_CENTRAL;
    sample.push("central");
  }

  const built = buildSection(section, { firewall: { state: firewallState, data: firewall.data }, central: { state: centralState, ...(central ? { data: central } : {}) } });
  return { ...built, fetchedAt: new Date().toISOString(), connections: { firewall: firewallState, central: centralState }, errors, ...(sample.length ? { sample } : {}) };
}
