import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AdminGateError, isAdminConfigured, resetAdminGate, tokensMatch, verifyAdminToken } from "./admin-gate.server";
import { FINDING_CATALOG, LABELS, LABEL_MARK, SECTION_META, SOPHOS_SECTIONS, cellText, type SectionResult } from "./sophos-catalog";
import {
  SophosError, analyze, buildSection, buildGetRequest, collectEntities, fetchCentral, fetchEntity, loadSection, readCentralConfig, readFirewallConfig, resetSophosCaches, type Collected,
} from "./sophos.server";
import { flatten, isOn, listOf, parseXml, pick, XmlParseError } from "./sophos-xml";

const PASSWORD = `p<ss&w"or'd-SECRET-123`;
const ENV = {
  SOPHOS_FW_HOST: "fw.test", SOPHOS_FW_USERNAME: "api-reader", SOPHOS_FW_PASSWORD: PASSWORD,
  SOPHOS_CENTRAL_CLIENT_ID: "cid-1", SOPHOS_CENTRAL_CLIENT_SECRET: "central-SECRET-456",
};

const response = (inner: string, login = "Authentication Successful") => `<?xml version="1.0" encoding="UTF-8"?><Response APIVersion="2200.1"><Login><status>${login}</status></Login>${inner}</Response>`;

const SAMPLES: Record<string, string> = {
  FirewallRule: `
    <FirewallRule transactionid=""><Name>Allow everything</Name><Status>Enable</Status><NetworkPolicy><Action>Accept</Action><LogTraffic>Disable</LogTraffic><SourceZones><Zone>Any</Zone></SourceZones><DestinationZones><Zone>Any</Zone></DestinationZones><Services><Service>Any</Service></Services></NetworkPolicy></FirewallRule>
    <FirewallRule transactionid=""><Name>Publish web</Name><Status>Enable</Status><NetworkPolicy><Action>Accept</Action><LogTraffic>Enable</LogTraffic><SourceZones><Zone>WAN</Zone></SourceZones><DestinationZones><Zone>LAN</Zone></DestinationZones><SourceNetworks><Network>Any</Network></SourceNetworks><DestinationNetworks><Network>Web server</Network></DestinationNetworks><Services><Service>Any</Service></Services></NetworkPolicy></FirewallRule>
    <FirewallRule transactionid=""><Name>Old rule</Name><Status>Disable</Status><NetworkPolicy><Action>Drop</Action></NetworkPolicy></FirewallRule>
    <FirewallRule transactionid=""><Name>LAN out</Name><Status>Enable</Status><NetworkPolicy><Action>Accept</Action><LogTraffic>Enable</LogTraffic><SourceZones><Zone>LAN</Zone></SourceZones><DestinationZones><Zone>WAN</Zone></DestinationZones><Services><Service>HTTPS</Service></Services></NetworkPolicy></FirewallRule>`,
  LocalServiceACL: `
    <LocalServiceACL><RuleName>Admin from WAN</RuleName><SourceZone>WAN</SourceZone><Hosts><Host>Any</Host></Hosts><Services><Service>HTTPS</Service><Service>SSH</Service></Services><Action>accept</Action></LocalServiceACL>
    <LocalServiceACL><RuleName>DNS from WAN</RuleName><SourceZone>WAN</SourceZone><Services><Service>DNS</Service></Services><Action>accept</Action></LocalServiceACL>
    <LocalServiceACL><RuleName>SSH office</RuleName><SourceZone>WAN</SourceZone><Hosts><Host>203.0.113.5</Host></Hosts><Services><Service>SSH</Service></Services><Action>accept</Action></LocalServiceACL>
    <LocalServiceACL><RuleName>LAN admin</RuleName><SourceZone>LAN</SourceZone><Services><Service>HTTPS</Service></Services><Action>accept</Action></LocalServiceACL>`,
  DoSSettings: `<DoSSettings>
    <SYNFlood><Source><PacketRatePerSource>12000</PacketRatePerSource><BurstRatePerSource>100</BurstRatePerSource><ApplyFlag>Enable</ApplyFlag></Source><Destination><PacketRatePerDestination>12000</PacketRatePerDestination><BurstRatePerDestination>100</BurstRatePerDestination><ApplyFlag>Enable</ApplyFlag></Destination></SYNFlood>
    <UDPFlood><Source><ApplyFlag>Disable</ApplyFlag></Source><Destination><ApplyFlag>Enable</ApplyFlag></Destination></UDPFlood>
    <TCPFlood><Source><ApplyFlag>Disable</ApplyFlag></Source><Destination><ApplyFlag>Disable</ApplyFlag></Destination></TCPFlood>
    <ICMPFlood><Source><ApplyFlag>Enable</ApplyFlag></Source><Destination><ApplyFlag>Enable</ApplyFlag></Destination></ICMPFlood>
    <DroppedSourceRoutedPackets><Destination><ApplyFlag>Disable</ApplyFlag></Destination></DroppedSourceRoutedPackets>
    <DisableICMPRedirectPacket><Destination><ApplyFlag>Enable</ApplyFlag></Destination></DisableICMPRedirectPacket>
    <DisableARPFlooding><Destination><ApplyFlag>Enable</ApplyFlag></Destination></DisableARPFlooding></DoSSettings>`,
  SpoofPrevention: `<SpoofPrevention><SpoofPrevention>Enable</SpoofPrevention><RestrictUnknownIPOnTrustedMAC>Disable</RestrictUnknownIPOnTrustedMAC><IPSpoofing><EnableOnZone/></IPSpoofing></SpoofPrevention>`,
  WebFilterPolicy: `
    <WebFilterPolicy><Name>Open</Name><DefaultAction>Allow</DefaultAction><RuleList><Rule><CategoryList><Category><ID>News</ID><type>WebCategory</type></Category></CategoryList><HTTPAction>Allow</HTTPAction><HTTPSAction>Allow</HTTPSAction><Schedule>All The Time</Schedule><PolicyRuleEnabled>1</PolicyRuleEnabled></Rule></RuleList></WebFilterPolicy>
    <WebFilterPolicy><Name>Strict</Name><DefaultAction>Allow</DefaultAction><EnforceSafeSearch>1</EnforceSafeSearch><RuleList><Rule><CategoryList><Category><ID>Extreme</ID><type>WebCategory</type></Category></CategoryList><HTTPAction>Deny</HTTPAction><HTTPSAction>Deny</HTTPSAction><Schedule>All The Time</Schedule><PolicyRuleEnabled>1</PolicyRuleEnabled></Rule></RuleList></WebFilterPolicy>`,
  ApplicationFilterPolicy: `<ApplicationFilterPolicy><Name>Open apps</Name><DefaultAction>Allow</DefaultAction><MicroAppSupport>True</MicroAppSupport><RuleList><Rule><CategoryList><Category>Games</Category></CategoryList><RiskList><Risk>3</Risk></RiskList><Action>Allow</Action><Schedule>All The Time</Schedule></Rule></RuleList></ApplicationFilterPolicy>`,
  SMTPPolicy: `
    <SMTPPolicy><Name>Bare</Name><DomainList><DomainName>example.test</DomainName></DomainList><SpamProtection><SpamProtectionStatus>OFF</SpamProtectionStatus></SpamProtection><MalwareProtection><MalwareProtectionStatus>OFF</MalwareProtectionStatus></MalwareProtection><Action>Accept</Action></SMTPPolicy>
    <SMTPPolicy><Name>Partial</Name><SpamProtection><SpamProtectionStatus>ON</SpamProtectionStatus><RecipientVerification>Off(Not Recommended)</RecipientVerification></SpamProtection><MalwareProtection><MalwareProtectionStatus>ON</MalwareProtectionStatus><ZeroDayProtection>Disable</ZeroDayProtection></MalwareProtection></SMTPPolicy>`,
  Interface: `<Interface><Name>Port1</Name><NetworkZone>LAN</NetworkZone><IPAddress>192.168.1.1</IPAddress><Netmask>255.255.255.0</Netmask></Interface><Interface><Name>Port2</Name><NetworkZone>WAN</NetworkZone><IPv4Configuration>DHCP</IPv4Configuration></Interface>`,
  Zone: `<Zone><Name>LAN</Name><Type>LAN</Type></Zone><Zone><Name>WAN</Name><Type>WAN</Type></Zone>`,
  IPHost: `<IPHost><Name>Web server</Name><IPFamily>IPv4</IPFamily><HostType>IP</HostType><IPAddress>10.0.0.10</IPAddress></IPHost><IPHost><Name>Office</Name><IPFamily>IPv4</IPFamily><HostType>Network</HostType><IPAddress>10.1.0.0</IPAddress><Subnet>255.255.0.0</Subnet></IPHost>`,
  UnicastRoute: `<UnicastRoute><DestinationIP>10.9.0.0</DestinationIP><Netmask>16</Netmask><Gateway>192.168.1.254</Gateway><Interface>Port1</Interface><AdministrativeDistance>1</AdministrativeDistance><Status>ON</Status></UnicastRoute>`,
  DNS: `<DNS><IPv4Settings><DNSSource>Static</DNSSource><DNS1>9.9.9.9</DNS1></IPv4Settings></DNS>`,
  AdminSettings: `<AdminSettings><WebAdminSettings><HTTPSport>4444</HTTPSport></WebAdminSettings><LoginSecurity><LogoutSession>20</LogoutSession></LoginSecurity><AdminPassword>hunter2</AdminPassword></AdminSettings>`,
  NATRule: `<NATRule><Name>MASQ</Name><Status>Enable</Status></NATRule>`,
};

type Call = { url: string; entity?: string; body: string };
function mockFirewallFetch(calls: Call[], options: { login?: string; status?: number; empty?: string[]; unsupported?: string[]; html?: boolean } = {}): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = String(init?.body ?? "");
    const reqxml = new URLSearchParams(body).get("reqxml") ?? "";
    const entity = /<Get><(\w+)>/.exec(reqxml)?.[1];
    calls.push({ url, ...(entity ? { entity } : {}), body: reqxml });
    if (options.status) return new Response("nope", { status: options.status });
    if (options.html) return new Response("<html><body>login</body></html>", { status: 200 });
    if (options.login) return new Response(response("", options.login));
    if (entity && options.empty?.includes(entity)) return new Response(response(`<${entity} transactionid=""><Status code="526">No. of records Zero.</Status></${entity}>`));
    if (entity && options.unsupported?.includes(entity)) return new Response(response(`<${entity}><Status code="529">Invalid XML</Status></${entity}>`));
    return new Response(response(SAMPLES[entity ?? ""] ?? ""));
  }) as typeof fetch;
}

function mockCentralFetch(calls: string[] = [], opts: { idType?: string; connected?: boolean; tokenStatus?: number } = {}): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (url === "https://id.sophos.com/api/v2/oauth2/token") {
      if (opts.tokenStatus) return new Response("{}", { status: opts.tokenStatus });
      const form = new URLSearchParams(String(init?.body));
      if (form.get("grant_type") !== "client_credentials" || form.get("scope") !== "token") return new Response("{}", { status: 400 });
      return Response.json({ access_token: "tok-1", token_type: "bearer", expires_in: 3600 });
    }
    if (url === "https://api.central.sophos.com/whoami/v1") {
      return Response.json({ id: "tenant-uuid", idType: opts.idType ?? "tenant", apiHosts: { global: "https://api.central.sophos.com", dataRegion: "https://api-eu01.central.sophos.com" } });
    }
    if (url.startsWith("https://api-eu01.central.sophos.com/firewall/v1/firewalls")) {
      const headers = new Headers(init?.headers);
      if (headers.get("Authorization") !== "Bearer tok-1" || headers.get("X-Tenant-ID") !== "tenant-uuid") return new Response("{}", { status: 401 });
      return Response.json({ items: [{ id: "f1", name: "HQ-FW", hostname: "hq-fw", serialNumber: "S123", firmwareVersion: "SFOS 21.0", model: "XGS 116", status: { connected: opts.connected ?? false, managing: "approved" }, stateChangedAt: "2026-11-01T10:00:00Z" }], pages: { total: 1 } });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
}

beforeEach(() => {
  resetSophosCaches();
  resetAdminGate();
});

describe("XML reader", () => {
  test("parses nesting, repeats, attributes, CDATA and entities", () => {
    const doc = parseXml(`<?xml version="1.0"?><!-- c --><R a="1" transactionid="x"><I>1</I><I>2</I><S code="526">none</S><T><![CDATA[<raw & text>]]></T><E>a &amp; b &#65;&#x42;</E><Empty/></R>`);
    const r = doc["R"] as Record<string, unknown>;
    expect(r["I"]).toEqual(["1", "2"]);
    expect(r["@a"]).toBe("1");
    expect(r["@transactionid"]).toBeUndefined();
    expect(r["S"]).toEqual({ "@code": "526", "#text": "none" });
    expect(r["T"]).toBe("<raw & text>");
    expect(r["E"]).toBe("a & b AB");
    expect(r["Empty"]).toBe("");
  });
  test("rejects DOCTYPE/entity declarations, mismatched tags and absurd nesting", () => {
    expect(() => parseXml(`<!DOCTYPE x [<!ENTITY a "b">]><x/>`)).toThrow(XmlParseError);
    expect(() => parseXml(`<a><b></a>`)).toThrow(XmlParseError);
    expect(() => parseXml(`<a>`)).toThrow(XmlParseError);
    expect(() => parseXml("<a>".repeat(200) + "</a>".repeat(200))).toThrow(XmlParseError);
  });
  test("on/off reader understands Sophos flag spellings", () => {
    for (const value of ["Enable", "ON", "1", "true", "$EMAILPROTECTION{SMTP_ANTISPAM_SETTING_ENABLE}"]) expect(isOn(value)).toBe(true);
    for (const value of ["Disable", "OFF", "0", "false", "None", "Off(Not Recommended)", "$EMAILPROTECTION{SMTP_ANTISPAM_SETTING_DISABLE}"]) expect(isOn(value)).toBe(false);
    for (const value of ["", "WithCallout(Recommended)", "Allow"]) expect(isOn(value)).toBeUndefined();
  });
  test("flatten redacts secret-looking keys", () => {
    const doc = parseXml(`<A><User>bob</User><AdminPassword>x</AdminPassword><Nested><SNMPCommunity>public</SNMPCommunity><Port>1</Port></Nested></A>`);
    const flat = Object.fromEntries(flatten(doc["A"]));
    expect(flat["User"]).toBe("bob");
    expect(flat["AdminPassword"]).toBe("••••••");
    expect(flat["Nested.SNMPCommunity"]).toBe("••••••");
    expect(flat["Nested.Port"]).toBe("1");
    expect(listOf(pick(doc["A"], "Nested"), "Port")).toEqual(["1"]);
  });
});

describe("firewall API client", () => {
  test("builds a login + Get request only, with XML-escaped credentials", () => {
    const xml = buildGetRequest({ username: "api", password: PASSWORD, apiVersion: "2200.1" }, "FirewallRule");
    expect(xml).toContain(`<Request APIVersion="2200.1">`);
    expect(xml).toContain("<Get><FirewallRule></FirewallRule></Get>");
    expect(xml).toContain("p&lt;ss&amp;w&quot;or&apos;d-SECRET-123");
    expect(xml).not.toMatch(/<(Set|Remove)\b/);
    expect(() => buildGetRequest({ username: "a", password: "b" }, "Rule><Remove")).toThrow(SophosError);
    expect(parseXml(xml)["Request"]).toBeDefined();
  });
  test("posts reqxml as a form to /webconsole/APIController and returns records", async () => {
    const calls: Call[] = [];
    const cfg = readFirewallConfig(ENV)!;
    const records = await fetchEntity(cfg, "IPHost", { fetch: mockFirewallFetch(calls) });
    expect(calls[0]?.url).toBe("https://fw.test:4444/webconsole/APIController");
    expect(calls[0]?.body).toContain("<Get><IPHost></IPHost></Get>");
    expect(records).toHaveLength(2);
    expect(str(records[0], "Name")).toBe("Web server");
  });
  test("zero-record and unsupported answers", async () => {
    const cfg = readFirewallConfig(ENV)!;
    expect(await fetchEntity(cfg, "IPHost", { fetch: mockFirewallFetch([], { empty: ["IPHost"] }) })).toEqual([]);
    await expect(fetchEntity(cfg, "IPHost", { fetch: mockFirewallFetch([], { unsupported: ["IPHost"] }) })).rejects.toMatchObject({ kind: "unsupported", fatal: false });
  });
  test("bad credentials, HTTP errors and non-XML are fatal with clear kinds", async () => {
    const cfg = readFirewallConfig(ENV)!;
    await expect(fetchEntity(cfg, "IPHost", { fetch: mockFirewallFetch([], { login: "Authentication Failure" }) })).rejects.toMatchObject({ kind: "auth", fatal: true });
    await expect(fetchEntity(cfg, "IPHost", { fetch: mockFirewallFetch([], { status: 403 }) })).rejects.toMatchObject({ kind: "auth" });
    await expect(fetchEntity(cfg, "IPHost", { fetch: mockFirewallFetch([], { status: 502 }) })).rejects.toMatchObject({ kind: "unreachable" });
    await expect(fetchEntity(cfg, "IPHost", { fetch: mockFirewallFetch([], { html: true }) })).rejects.toMatchObject({ kind: "invalid" });
  });
  test("a failed login stops after ONE request (no admin lockout) and is cached", async () => {
    const calls: Call[] = [];
    const cfg = readFirewallConfig(ENV)!;
    const result = await collectEntities(cfg, ["FirewallRule", "Zone", "IPHost", "DNS"], { fetch: mockFirewallFetch(calls, { login: "Authentication Failure" }) });
    expect(result.fatal?.kind).toBe("auth");
    expect(calls).toHaveLength(1);
    const deps = { fetch: mockFirewallFetch(calls, { login: "Authentication Failure" }), };
    await loadSection("policies", { env: ENV, deps });
    const before = calls.length;
    const again = await loadSection("policies", { env: ENV, deps, fresh: true });
    expect(calls.length).toBe(before);
    expect(again.connections.firewall).toBe("error");
  });
  test("config validation", () => {
    expect(readFirewallConfig({})).toBeNull();
    expect(() => readFirewallConfig({ SOPHOS_FW_HOST: "x" })).toThrow(SophosError);
    expect(() => readFirewallConfig({ ...ENV, SOPHOS_FW_HOST: "https://fw.test/path" })).toThrow(SophosError);
    expect(() => readFirewallConfig({ ...ENV, SOPHOS_FW_PORT: "99999" })).toThrow(SophosError);
    expect(() => readFirewallConfig({ ...ENV, SOPHOS_FW_CA_CERT: "not a cert" })).toThrow(SophosError);
    expect(readFirewallConfig({ ...ENV, SOPHOS_FW_PORT: "8443" })?.port).toBe(8443);
    expect(readCentralConfig({})).toBeNull();
    expect(() => readCentralConfig({ SOPHOS_CENTRAL_CLIENT_ID: "a" })).toThrow(SophosError);
  });
});

function str(value: unknown, key: string): string {
  const v = pick(value as never, key);
  return typeof v === "string" ? v : "";
}

describe("misconfiguration analysis", () => {
  async function collected(): Promise<Collected> {
    const cfg = readFirewallConfig(ENV)!;
    const entities = ["FirewallRule", "LocalServiceACL", "DoSSettings", "SpoofPrevention", "WebFilterPolicy", "ApplicationFilterPolicy", "SMTPPolicy"];
    const { data, fatal } = await collectEntities(cfg, entities, { fetch: mockFirewallFetch([]) });
    expect(fatal).toBeUndefined();
    return data;
  }
  test("finds every seeded problem and nothing else", async () => {
    const findings = analyze({ firewall: { state: "ok", data: await collected() }, central: { state: "skipped" } });
    const byRule = Object.fromEntries(findings.map((f) => [f.rule, f]));
    expect(Object.keys(byRule).sort()).toEqual([
      "admin-wan-open", "admin-wan-restricted", "app-no-blocking", "dos-flood-off", "dos-flood-partial", "dos-hardening-off", "email-malware-off",
      "email-recipient-verification-off", "email-spam-off", "email-zeroday-off", "fw-accept-no-log", "fw-any-any-accept", "fw-disabled-rules", "fw-wan-accept-any-service",
      "service-wan-exposed", "spoof-no-zones", "web-no-blocking",
    ]);
    expect(byRule["fw-any-any-accept"]?.subjects).toEqual(["Allow everything"]);
    expect(byRule["fw-wan-accept-any-service"]?.subjects).toEqual(["Publish web"]);
    expect(byRule["fw-disabled-rules"]?.subjects).toEqual(["Old rule"]);
    expect(byRule["admin-wan-open"]?.severity).toBe("Critical");
    expect(byRule["admin-wan-open"]?.subjects[0]).toContain("Admin from WAN");
    expect(byRule["admin-wan-restricted"]?.subjects[0]).toContain("SSH office");
    expect(byRule["service-wan-exposed"]?.subjects[0]).toContain("DNS from WAN");
    expect(byRule["web-no-blocking"]?.subjects).toEqual(["Open"]);
    expect(byRule["email-spam-off"]?.subjects).toEqual(["Bare"]);
    expect(byRule["email-zeroday-off"]?.subjects).toEqual(["Partial"]);
    expect(byRule["dos-flood-off"]?.subjects).toEqual([`${LABEL_MARK}dos.tcp`]);
    expect(byRule["dos-flood-partial"]?.subjects).toEqual([`${LABEL_MARK}dos.udp`]);
    expect(findings[0]?.severity).toBe("Critical");
  });
  test("a clean configuration produces no findings", () => {
    const data: Collected = { FirewallRule: { records: [] }, LocalServiceACL: { records: [] } };
    expect(analyze({ firewall: { state: "ok", data }, central: { state: "skipped" } })).toEqual([]);
  });
  test("unreadable entities never produce false findings", () => {
    const data: Collected = { DoSSettings: { records: [parseXml("<DoSSettings><SYNFlood/></DoSSettings>")["DoSSettings"] as never] } };
    expect(analyze({ firewall: { state: "ok", data }, central: { state: "skipped" } })).toEqual([]);
  });
});

describe("sections end to end", () => {
  const deps = () => ({ fetch: ((...args: Parameters<typeof fetch>) => (String(args[0]).includes("webconsole") ? mockFirewallFetch([])(...args) : mockCentralFetch([])(...args))) as typeof fetch });
  async function all(): Promise<Record<string, SectionResult>> {
    const out: Record<string, SectionResult> = {};
    for (const section of SOPHOS_SECTIONS) out[section] = await loadSection(section, { env: ENV, deps: deps() });
    return out;
  }
  test("every section renders data, and no secret ever appears in any result", async () => {
    const results = await all();
    const json = JSON.stringify(results);
    for (const secret of [PASSWORD, "p<ss", "SECRET-123", "central-SECRET-456", "hunter2", "tok-1"]) expect(json).not.toContain(secret);
    expect(json).toContain("••••••");
    expect(results["basic"]?.tables.map((t) => t.id)).toEqual(["table.interfaces", "table.zones", "table.hosts", "table.routes", "table.dns"]);
    expect(results["policies"]?.tables[0]?.rows[0]).toEqual(["1", "Allow everything", `${LABEL_MARK}on`, "accept", "Any · Any", "Any · Any", "Any", `${LABEL_MARK}off`]);
    expect(results["dos"]?.summary.find((s) => s.id === "dos.floodOn")?.value).toBe("3/4");
    expect(results["web"]?.tables[1]?.rows[1]?.[1]).toBe("Extreme");
    expect(results["apps"]?.tables[0]?.rows[0]).toEqual(["Open apps", "Allow", "1", "0", `${LABEL_MARK}on`]);
    expect(results["email"]?.tables[0]?.rows[0]?.slice(0, 4)).toEqual(["Bare", "example.test", `${LABEL_MARK}off`, `${LABEL_MARK}off`]);
    expect(results["general"]?.tables.map((t) => t.id)).toEqual(["table.admin", "table.access"]);
    expect(results["central"]?.tables[0]?.rows[0]?.[0]).toBe("HQ-FW");
    expect(results["central"]?.connections).toEqual({ firewall: "skipped", central: "ok" });
    expect(results["overview"]?.findings.length).toBeGreaterThan(5);
    expect(results["overview"]?.findings.some((f) => f.rule === "central-disconnected")).toBe(true);
    expect(results["misconfig"]?.summary.find((s) => s.id === "count.critical")?.value).toBe("2");
  });
  test("labels and catalog cover everything the server can emit", async () => {
    const results = await all();
    for (const section of SOPHOS_SECTIONS) expect(SECTION_META[section]).toBeDefined();
    for (const result of Object.values(results)) {
      for (const finding of result.findings) expect(FINDING_CATALOG[finding.rule]).toBeDefined();
      const ids = new Set<string>();
      for (const item of result.summary) {
        ids.add(item.id);
        if (item.value.startsWith(LABEL_MARK)) ids.add(item.value.slice(1));
      }
      for (const table of result.tables) {
        ids.add(table.id);
        table.columns.forEach((c) => ids.add(c));
        table.rows.flat().filter((c) => c.startsWith(LABEL_MARK)).forEach((c) => ids.add(c.slice(1)));
      }
      for (const finding of result.findings) finding.subjects.filter((s) => s.startsWith(LABEL_MARK)).forEach((s) => ids.add(s.slice(1)));
      for (const id of ids) expect(LABELS[id], `missing label: ${id}`).toBeDefined();
    }
    expect(cellText(`${LABEL_MARK}on`, true)).toBe("مفعّل");
    expect(cellText("plain", true)).toBe("plain");
  });
  test("unconfigured, partial failures and per-entity errors degrade gracefully", async () => {
    const none = await loadSection("overview", { env: {}, deps: deps() });
    expect(none.connections).toEqual({ firewall: "unconfigured", central: "unconfigured" });
    const partial = await loadSection("web", { env: ENV, deps: { fetch: mockFirewallFetch([], { unsupported: ["WebFilterPolicy"] }) } });
    expect(partial.connections.firewall).toBe("ok");
    expect(partial.errors).toEqual([{ entity: "WebFilterPolicy", kind: "unsupported", message: "The firewall reported status 529 for WebFilterPolicy." }]);
    const bad = await loadSection("basic", { env: { ...ENV, SOPHOS_FW_PORT: "0" }, deps: deps() });
    expect(bad.connections.firewall).toBe("error");
    expect(bad.errors[0]?.kind).toBe("config");
  });
  test("control characters in firewall data cannot impersonate a label", async () => {
    const evil = `<Zone><Name>${LABEL_MARK.replace(LABEL_MARK, "")}x</Name></Zone>`;
    const fetchImpl = (async () => new Response(response(evil.replace("x", "\u0001on")))) as unknown as typeof fetch;
    const result = await loadSection("basic", { env: ENV, deps: { fetch: fetchImpl } });
    for (const row of result.tables.find((t) => t.id === "table.zones")?.rows ?? []) expect(row[0]?.startsWith(LABEL_MARK)).toBe(false);
  });
});

describe("Sophos Central client", () => {
  test("token -> whoami -> firewalls, with the right headers and the region host check", async () => {
    const calls: string[] = [];
    const data = await fetchCentral(readCentralConfig(ENV)!, { fetch: mockCentralFetch(calls) });
    expect(data.tenantType).toBe("tenant");
    expect(data.firewalls).toHaveLength(1);
    expect(calls[0]).toBe("https://id.sophos.com/api/v2/oauth2/token");
    expect(calls[2]).toContain("https://api-eu01.central.sophos.com/firewall/v1/firewalls?");
    expect(calls[2]).toContain("pageSize=100");
  });
  test("token is cached between calls", async () => {
    const calls: string[] = [];
    const deps = { fetch: mockCentralFetch(calls) };
    await fetchCentral(readCentralConfig(ENV)!, deps);
    await fetchCentral(readCentralConfig(ENV)!, deps);
    expect(calls.filter((c) => c.includes("oauth2"))).toHaveLength(1);
  });
  test("partner/organization credentials, bad secrets and foreign region hosts are rejected", async () => {
    await expect(fetchCentral(readCentralConfig(ENV)!, { fetch: mockCentralFetch([], { idType: "partner" }) })).rejects.toMatchObject({ kind: "config" });
    resetSophosCaches();
    await expect(fetchCentral(readCentralConfig(ENV)!, { fetch: mockCentralFetch([], { tokenStatus: 401 }) })).rejects.toMatchObject({ kind: "auth" });
    resetSophosCaches();
    const evil = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("oauth2")) return Response.json({ access_token: "t", expires_in: 60 });
      return Response.json({ id: "x", idType: "tenant", apiHosts: { dataRegion: "https://evil.example.com" } });
    }) as unknown as typeof fetch;
    await expect(fetchCentral(readCentralConfig(ENV)!, { fetch: evil })).rejects.toMatchObject({ kind: "invalid" });
  });
  test("a Central failure does not break firewall sections", async () => {
    const mixed = ((...args: Parameters<typeof fetch>) => (String(args[0]).includes("webconsole") ? mockFirewallFetch([])(...args) : mockCentralFetch([], { tokenStatus: 401 })(...args))) as typeof fetch;
    const result = await loadSection("overview", { env: ENV, deps: { fetch: mixed } });
    expect(result.connections).toEqual({ firewall: "ok", central: "error" });
    expect(result.errors.some((e) => e.entity === "central" && e.kind === "auth")).toBe(true);
    expect(result.findings.some((f) => f.rule === "fw-any-any-accept")).toBe(true);
  });
});

describe("admin gate", () => {
  const env = { SOPHOS_ADMIN_TOKEN: "correct-horse-battery-staple" };
  test("accepts only the exact token and compares in constant time", async () => {
    expect(await tokensMatch("a", "a")).toBe(true);
    expect(await tokensMatch("a", "ab")).toBe(false);
    await expect(verifyAdminToken("correct-horse-battery-staple", "1.1.1.1", env)).resolves.toBeUndefined();
    await expect(verifyAdminToken("wrong", "1.1.1.1", env)).rejects.toMatchObject({ code: "invalid", message: "Invalid admin token." });
  });
  test("is closed when the token is missing or too short", async () => {
    await expect(verifyAdminToken("x", "ip", {})).rejects.toMatchObject({ code: "unconfigured" });
    await expect(verifyAdminToken("short", "ip", { SOPHOS_ADMIN_TOKEN: "short" })).rejects.toBeInstanceOf(AdminGateError);
  });
  test("locks a client out after repeated failures, even for the right token, but not other clients", async () => {
    for (let i = 0; i < 5; i++) await expect(verifyAdminToken("bad", "9.9.9.9", env)).rejects.toThrow("Invalid admin token.");
    await expect(verifyAdminToken("correct-horse-battery-staple", "9.9.9.9", env)).rejects.toMatchObject({ code: "locked" });
    await expect(verifyAdminToken("correct-horse-battery-staple", "8.8.8.8", env)).resolves.toBeUndefined();
  });
});

describe("pinned CA for self-signed firewalls (real TLS)", () => {
  let dir = "";
  let server: ReturnType<typeof Bun.serve> | undefined;
  let certB64 = "";
  let otherCertB64 = "";
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "sophos-tls-"));
    const make = (name: string) => {
      execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, `${name}.key`), "-out", join(dir, `${name}.crt`), "-days", "2", "-subj", `/CN=${name}.sophos.invalid`], { stdio: "ignore" });
      return readFileSync(join(dir, `${name}.crt`), "utf8");
    };
    certB64 = btoa(make("fw"));
    otherCertB64 = btoa(make("other"));
    server = Bun.serve({
      port: 0, tls: { key: Bun.file(join(dir, "fw.key")), cert: Bun.file(join(dir, "fw.crt")) },
      fetch: async (req) => {
        const entity = /<Get><(\w+)>/.exec(new URLSearchParams(await req.text()).get("reqxml") ?? "")?.[1];
        return new Response(response(SAMPLES[entity ?? ""] ?? ""), { headers: { "Content-Type": "text/xml" } });
      },
    });
  });
  afterAll(() => {
    server?.stop(true);
    rmSync(dir, { recursive: true, force: true });
  });
  const env = (ca?: string) => ({ ...ENV, SOPHOS_FW_HOST: "127.0.0.1", SOPHOS_FW_PORT: String(server?.port), ...(ca ? { SOPHOS_FW_CA_CERT: ca } : {}) });
  test("works with the firewall's own certificate pinned (hostname mismatch tolerated)", async () => {
    const records = await fetchEntity(readFirewallConfig(env(certB64))!, "IPHost");
    expect(records).toHaveLength(2);
  });
  test("refuses a different certificate", async () => {
    await expect(fetchEntity(readFirewallConfig(env(otherCertB64))!, "IPHost")).rejects.toBeInstanceOf(SophosError);
  });
  test("refuses the self-signed certificate when nothing is pinned", async () => {
    await expect(fetchEntity(readFirewallConfig(env())!, "IPHost")).rejects.toBeInstanceOf(SophosError);
  });
});

describe("sample data fallback", () => {
  const deps = () => ({ fetch: ((...args: Parameters<typeof fetch>) => (String(args[0]).includes("webconsole") ? mockFirewallFetch([])(...args) : mockCentralFetch([])(...args))) as typeof fetch });
  test("unconfigured sources show labelled sample data for every section", async () => {
    for (const section of SOPHOS_SECTIONS) {
      const result = await loadSection(section, { env: {}, deps: deps() });
      if (section === "central") expect(result.sample).toEqual(["central"]);
      else expect(result.sample).toContain("firewall");
      expect(result.errors).toEqual([]);
      if (section === "ips") expect(result.ips?.signatures.length).toBeGreaterThan(10);
      else if (section !== "misconfig" && section !== "overview") expect(result.tables.length).toBeGreaterThan(0);
    }
    const mis = await loadSection("misconfig", { env: {}, deps: deps() });
    expect(mis.findings.length).toBeGreaterThan(0);
    expect(mis.findings.map((f) => f.rule)).toContain("admin-wan-open");
  });

  test("configured sources never fall back, and failures stay visible", async () => {
    const real = await loadSection("web", { env: ENV, deps: deps() });
    expect(real.sample).toBeUndefined();
    const bad = await loadSection("basic", { env: { ...ENV, SOPHOS_FW_PORT: "0" }, deps: deps() });
    expect(bad.sample).toBeUndefined();
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});

describe("admin gate configuration", () => {
  test("live data is only gated-in when a 16+ character token is configured", () => {
    expect(isAdminConfigured({})).toBe(false);
    expect(isAdminConfigured({ SOPHOS_ADMIN_TOKEN: "short" })).toBe(false);
    expect(isAdminConfigured({ SOPHOS_ADMIN_TOKEN: "a".repeat(16) })).toBe(true);
  });
});

describe("IPS section", () => {
  const none = { env: {}, deps: { fetch: (async () => new Response("{}", { status: 404 })) as typeof fetch } };

  test("sample data lists a signature catalog, policies, coverage and IPS findings", async () => {
    const result = await loadSection("ips", none);
    const ips = result.ips!;
    expect(ips.kind).toBe("catalog");
    expect(ips.policies.map((p) => p.name)).toContain("Server Protection");
    expect(new Set(ips.signatures.map((s) => s.id)).size).toBe(ips.signatures.length);
    expect(ips.signatures.some((s) => s.cve === "CVE-2021-44228" && s.hits?.length === 12)).toBe(true);
    expect(ips.coverage.some((c) => !c.covered)).toBe(true);
    expect(result.findings.map((f) => f.rule).sort()).toEqual(["ips-detect-only", "ips-wan-rule-uncovered"]);
    const byPolicy = ips.policies.reduce((sum, p) => sum + p.rules, 0);
    expect(byPolicy).toBe(ips.signatures.length);
  });

  test("live data turns IPS policies into rule groups and checks coverage", () => {
    const xml = (value: Record<string, unknown>) => value as never;
    const built = buildSection("ips", {
      firewall: { state: "ok", data: {
        IPSPolicy: { records: [xml({ Name: "strict", RuleList: { Rule: [{ Category: "Web Servers", Severity: "Critical", Platform: "Server", Target: "Server", Action: "Drop Packet" }, { Category: "P2P", Severity: "Low", Action: "Allow Packet" }] } })] },
        FirewallRule: { records: [
          xml({ Name: "open", Status: "Enable", NetworkPolicy: { Action: "Accept", SourceZones: { Zone: "WAN" }, DestinationZones: { Zone: "DMZ" }, IntrusionPrevention: "None" } }),
          xml({ Name: "guarded", Status: "Enable", NetworkPolicy: { Action: "Accept", SourceZones: { Zone: "WAN" }, DestinationZones: { Zone: "DMZ" }, IntrusionPrevention: "strict" } }),
        ] },
      } },
      central: { state: "skipped" },
    });
    expect(built.ips?.kind).toBe("rules");
    expect(built.ips?.signatures.map((s) => [s.category, s.severity, s.action])).toEqual([["Web Servers", "Critical", "Drop"], ["P2P", "Low", "Detect"]]);
    expect(built.ips?.coverage.map((c) => [c.rule, c.covered])).toEqual([["open", false], ["guarded", true]]);
    expect(built.findings.map((f) => f.rule)).toEqual(["ips-wan-rule-uncovered"]);
    expect(built.findings[0]?.subjects).toEqual(["open"]);
  });

  test("firmware that does not report an IPS field produces no coverage findings", () => {
    const built = buildSection("ips", { firewall: { state: "ok", data: { FirewallRule: { records: [{ Name: "r", Status: "Enable", NetworkPolicy: { Action: "Accept", SourceZones: { Zone: "WAN" } } }] as never } } }, central: { state: "skipped" } });
    expect(built.findings).toEqual([]);
  });
});
