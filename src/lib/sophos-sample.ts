import type { Collected, CentralData } from "./sophos.server";
import type { IpsAction, IpsData, IpsSignature } from "./sophos-catalog";
import type { XmlObject } from "./sophos-xml";
import type { Severity } from "./xdr-demo";

/**
 * Sample ("mock") Sophos Firewall data shown ONLY while the firewall / Sophos Central
 * credentials are not configured, so the dashboard shows what a real tenant looks like.
 * Shaped like the parsed XML API replies, so the same builders render it. Everything here is
 * invented (RFC 5737 / RFC 1918 addresses, fictional hosts); the UI labels it as sample data.
 * It deliberately contains a few realistic weaknesses so the Misconfiguration page has findings.
 */

const zone = (...items: string[]) => ({ Zone: items.length === 1 ? items[0]! : items });
const net = (...items: string[]) => ({ Network: items.length === 1 ? items[0]! : items });
const svc = (...items: string[]) => ({ Service: items.length === 1 ? items[0]! : items });

function rule(name: string, o: { status?: string; action: string; log?: string; src?: string[]; dst?: string[]; srcNet?: string[]; dstNet?: string[]; services?: string[]; ips?: string }): XmlObject {
  return {
    Name: name,
    Status: o.status ?? "Enable",
    NetworkPolicy: {
      Action: o.action,
      LogTraffic: o.log ?? "Enable",
      IntrusionPrevention: o.ips ?? "None",
      ...(o.src ? { SourceZones: zone(...o.src) } : {}),
      ...(o.dst ? { DestinationZones: zone(...o.dst) } : {}),
      ...(o.srcNet ? { SourceNetworks: net(...o.srcNet) } : {}),
      ...(o.dstNet ? { DestinationNetworks: net(...o.dstNet) } : {}),
      ...(o.services ? { Services: svc(...o.services) } : {}),
    },
  };
}

const flood = (src: boolean, dst: boolean, pps: string, burst: string): XmlObject => ({
  Source: { ApplyFlag: src ? "Enable" : "Disable", PacketRatePerSource: pps, BurstRatePerSource: burst },
  Destination: { ApplyFlag: dst ? "Enable" : "Disable", PacketRatePerDestination: String(Number(pps) * 4), BurstRatePerDestination: String(Number(burst) * 4) },
});

const webRule = (categories: string[], http: string, https: string, schedule = "All The Time"): XmlObject => ({
  CategoryList: { Category: categories.map((ID) => ({ ID })) },
  HTTPAction: http,
  HTTPSAction: https,
  Schedule: schedule,
  PolicyRuleEnabled: "1",
});

export const SAMPLE_FIREWALL: Collected = {
  Interface: {
    records: [
      { Name: "Port1", NetworkZone: "LAN", IPAddress: "10.10.0.1", Netmask: "255.255.255.0", Status: "Connected" },
      { Name: "Port2", NetworkZone: "WAN", IPv4Configuration: "DHCP", IPAddress: "198.51.100.24", Netmask: "255.255.255.248", Status: "Connected" },
      { Name: "Port3", NetworkZone: "DMZ", IPAddress: "172.16.20.1", Netmask: "255.255.255.0", Status: "Connected" },
      { Name: "Port4", NetworkZone: "Guest", IPAddress: "192.168.50.1", Netmask: "255.255.255.0", Status: "Connected" },
      { Name: "Port5", NetworkZone: "LAN", IPAddress: "10.10.5.1", Netmask: "255.255.255.0", Status: "Not connected" },
    ],
  },
  Zone: { records: [{ Name: "LAN", Type: "LAN" }, { Name: "WAN", Type: "WAN" }, { Name: "DMZ", Type: "DMZ" }, { Name: "Guest", Type: "LAN" }, { Name: "VPN", Type: "VPN" }] },
  IPHost: {
    records: [
      { Name: "Office-LAN", IPFamily: "IPv4", HostType: "Network", IPAddress: "10.10.0.0", Subnet: "255.255.255.0" },
      { Name: "DMZ-Web-01", IPFamily: "IPv4", HostType: "IP", IPAddress: "172.16.20.10" },
      { Name: "DMZ-Mail-01", IPFamily: "IPv4", HostType: "IP", IPAddress: "172.16.20.25" },
      { Name: "Guest-Range", IPFamily: "IPv4", HostType: "IPRange", StartIPAddress: "192.168.50.50", EndIPAddress: "192.168.50.200" },
      { Name: "Admin-Workstations", IPFamily: "IPv4", HostType: "IPList", ListOfIPAddresses: "10.10.0.21,10.10.0.22" },
    ],
  },
  UnicastRoute: {
    records: [
      { DestinationIP: "0.0.0.0", Netmask: "0.0.0.0", Gateway: "198.51.100.25", Interface: "Port2", AdministrativeDistance: "1", Status: "Enable" },
      { DestinationIP: "10.20.0.0", Netmask: "255.255.0.0", Gateway: "10.10.0.254", Interface: "Port1", AdministrativeDistance: "10", Status: "Enable" },
      { DestinationIP: "10.99.0.0", Netmask: "255.255.0.0", Gateway: "10.10.0.253", Interface: "Port1", AdministrativeDistance: "20", Status: "Disable" },
    ],
  },
  DNS: { records: [{ DNSIPSource: "DHCP", IPv4Settings: { DNSServer1: "1.1.1.1", DNSServer2: "9.9.9.9" }, Domain: "corp.example.test" }] },
  FirewallRule: {
    records: [
      rule("Allow LAN to WAN", { action: "Accept", src: ["LAN"], dst: ["WAN"], srcNet: ["Office-LAN"], services: ["HTTP", "HTTPS", "DNS"], ips: "General Client Policy" }),
      rule("Publish Web Server", { action: "Accept", src: ["WAN"], dst: ["DMZ"], srcNet: ["Any"], dstNet: ["DMZ-Web-01"], services: ["HTTP", "HTTPS"], ips: "Server Protection" }),
      rule("Mail Inbound", { action: "Accept", src: ["WAN"], dst: ["DMZ"], dstNet: ["DMZ-Mail-01"], services: ["SMTP"], log: "Disable", ips: "Server Protection" }),
      rule("Guest Internet", { action: "Accept", src: ["Guest"], dst: ["WAN"], srcNet: ["Guest-Range"], services: ["HTTP", "HTTPS", "DNS"], ips: "General Client Policy" }),
      rule("Admin to DMZ", { action: "Accept", src: ["LAN"], dst: ["DMZ"], srcNet: ["Admin-Workstations"], services: ["SSH", "RDP"] }),
      rule("Temp Vendor Access", { action: "Accept", src: ["WAN"], dst: ["LAN"], srcNet: ["Any"], services: [] }),
      rule("Old Test Rule", { status: "Disable", action: "Accept", src: ["LAN"], dst: ["WAN"] }),
      rule("Block Guest to LAN", { action: "Drop", src: ["Guest"], dst: ["LAN"] }),
      rule("Default Deny", { action: "Drop", src: ["Any"], dst: ["Any"] }),
    ],
  },
  IPSPolicy: {
    records: [
      { Name: "Server Protection", Description: "Exploit and brute-force protection for published servers", RuleList: { Rule: [
        { Category: "Web Servers", Severity: "Critical", Platform: "Server", Target: "Server", Action: "Drop Packet" },
        { Category: "Web Applications", Severity: "High", Platform: "Server", Target: "Server", Action: "Drop Packet" },
        { Category: "Mail Servers", Severity: "High", Platform: "Server", Target: "Server", Action: "Recommended" },
        { Category: "Brute Force", Severity: "Medium", Platform: "Linux", Target: "Server", Action: "Allow Packet" },
      ] } },
      { Name: "General Client Policy", Description: "Client-side and malware command-and-control protection", RuleList: { Rule: [
        { Category: "Malware", Severity: "Critical", Platform: "Any", Target: "Client", Action: "Drop Packet" },
        { Category: "Browsers", Severity: "High", Platform: "Windows", Target: "Client", Action: "Recommended" },
        { Category: "P2P", Severity: "Low", Platform: "Any", Target: "Client", Action: "Allow Packet" },
      ] } },
      { Name: "Lab Monitor", Description: "Logging only, used for the lab network", RuleList: { Rule: [
        { Category: "All", Severity: "Critical", Platform: "Any", Target: "Any", Action: "Allow Packet" },
        { Category: "All", Severity: "High", Platform: "Any", Target: "Any", Action: "Allow Packet" },
      ] } },
    ],
  },
  NATRule: { records: [{ Name: "MASQ LAN to WAN", Status: "Enable" }, { Name: "DNAT Web Server", Status: "Enable" }, { Name: "DNAT Mail", Status: "Enable" }] },
  LocalServiceACL: {
    records: [
      { RuleName: "LAN admin access", SourceZone: "LAN", Hosts: { Host: "Any" }, Services: { Service: ["HTTPS", "SSH", "Ping", "DNS"] }, Action: "Accept" },
      { RuleName: "WAN admin console", SourceZone: "WAN", Hosts: { Host: "Any" }, Services: { Service: ["HTTPS"] }, Action: "Accept" },
      { RuleName: "WAN DNS", SourceZone: "WAN", Hosts: { Host: "Any" }, Services: { Service: ["DNS"] }, Action: "Accept" },
      { RuleName: "DMZ ping", SourceZone: "DMZ", Hosts: { Host: "Any" }, Services: { Service: ["Ping"] }, Action: "Accept" },
    ],
  },
  DoSSettings: {
    records: [{
      SYNFlood: flood(true, true, "100", "200"),
      UDPFlood: flood(true, false, "150", "300"),
      TCPFlood: flood(false, false, "100", "200"),
      ICMPFlood: flood(true, true, "50", "100"),
      DroppedSourceRoutedPackets: { Destination: { ApplyFlag: "Enable" } },
      DisableICMPRedirectPacket: { Destination: { ApplyFlag: "Enable" } },
      DisableARPFlooding: { Destination: { ApplyFlag: "Disable" } },
    }],
  },
  SpoofPrevention: {
    records: [{
      SpoofPrevention: "Enable",
      RestrictUnknownIPOnTrustedMAC: "Disable",
      IPSpoofing: { EnableOnZone: zone("WAN", "DMZ") },
      MACFilter: { EnableOnZone: zone("LAN") },
      IPMACFilter: { EnableOnZone: zone("Guest") },
    }],
  },
  WebFilterPolicy: {
    records: [
      { Name: "Corporate Web Policy", DefaultAction: "Allow", EnforceSafeSearch: "Enable", YoutubeFilterEnabled: "Disable", RuleList: { Rule: [
        webRule(["Pornography", "Hacking", "Phishing & Fraud"], "Deny", "Deny"),
        webRule(["Streaming Media", "Social Networking"], "Warn", "Warn", "Work Hours"),
      ] } },
      { Name: "Guest Web Policy", DefaultAction: "Allow", EnforceSafeSearch: "Enable", YoutubeFilterEnabled: "Enable", RuleList: { Rule: [webRule(["Pornography", "Weapons", "Anonymizers"], "Deny", "Deny")] } },
      { Name: "Servers Web Policy", DefaultAction: "Allow", EnforceSafeSearch: "Disable", YoutubeFilterEnabled: "Disable", RuleList: { Rule: [webRule(["Software Updates"], "Allow", "Allow")] } },
      { Name: "Allow All", DefaultAction: "Allow", EnforceSafeSearch: "Disable", YoutubeFilterEnabled: "Disable" },
    ],
  },
  ApplicationFilterPolicy: {
    records: [
      { Name: "Block High Risk Apps", DefaultAction: "Allow", MicroAppSupport: "Enable", RuleList: { Rule: [
        { CategoryList: { Category: [{ ID: "Proxy & Tunnel" }, { ID: "P2P" }] }, RiskList: { Risk: [{ ID: "4" }, { ID: "5" }] }, Action: "Deny", Schedule: "All The Time" },
        { CategoryList: { Category: [{ ID: "Gaming" }] }, RiskList: { Risk: [{ ID: "3" }] }, Action: "Deny", Schedule: "Work Hours" },
      ] } },
      { Name: "Monitor Only", DefaultAction: "Allow", MicroAppSupport: "Disable", RuleList: { Rule: [
        { CategoryList: { Category: [{ ID: "File Transfer" }] }, RiskList: { Risk: [{ ID: "2" }] }, Action: "Allow", Schedule: "All The Time" },
      ] } },
      { Name: "Allow All", DefaultAction: "Allow", MicroAppSupport: "Disable" },
    ],
  },
  SMTPPolicy: {
    records: [
      { Name: "Corporate Mail", Action: "Accept", DomainList: { DomainName: ["corp.example.test", "mail.example.test"] },
        SpamProtection: { SpamProtectionStatus: "Enable", RecipientVerification: "On" },
        MalwareProtection: { MalwareProtectionStatus: "Enable", ZeroDayProtection: "Enable" },
        FiletypeFilter: { FiletypeFilterStatus: "Enable" }, DataProtection: { DataProtectionStatus: "Disable" } },
      { Name: "Marketing Mail", Action: "Accept", DomainList: { DomainName: "news.example.test" },
        SpamProtection: { SpamProtectionStatus: "Disable", RecipientVerification: "Off" },
        MalwareProtection: { MalwareProtectionStatus: "Enable", ZeroDayProtection: "Disable" },
        FiletypeFilter: { FiletypeFilterStatus: "Disable" }, DataProtection: { DataProtectionStatus: "Disable" } },
    ],
  },
  AdminSettings: {
    records: [{
      HostnameSettings: { HostName: "sample-xgs-01" },
      WebAdminSettings: { HTTPSport: "4444", SessionTimeout: "30", LoginSecurity: "Enable", PasswordComplexityCheck: "Enable" },
      LoginDisclaimer: "Disable",
      Time: { TimeZone: "UTC", NTPServer: "pool.ntp.org" },
      AdminPassword: "not-a-real-secret",
    }],
  },
};

export const SAMPLE_CENTRAL: CentralData = {
  tenantType: "tenant",
  firewalls: [
    { name: "HQ-Firewall", hostname: "sample-xgs-01", serialNumber: "X1A2B3C4D5E6F7G", model: "XGS 2300", firmwareVersion: "SFOS 21.0.1 MR-1", status: { connected: true, managing: true }, healthStatus: "good", stateChangedAt: "2026-11-01T08:12:00Z" },
    { name: "Branch-Cairo", hostname: "sample-xgs-02", serialNumber: "X2B3C4D5E6F7G8H", model: "XGS 116", firmwareVersion: "SFOS 20.0.3 MR-3", status: { connected: true, managing: true }, healthStatus: "suspicious", stateChangedAt: "2026-10-28T14:40:00Z" },
    { name: "Branch-Alex", hostname: "sample-xgs-03", serialNumber: "X3C4D5E6F7G8H9I", model: "XGS 107", firmwareVersion: "SFOS 20.0.3 MR-3", status: { connected: false, managing: false }, healthStatus: "unknown", stateChangedAt: "2026-11-05T22:03:00Z" },
  ],
};

/* ---------------------------------------------------------- IPS signature catalog */

type Row = [id: string, name: string, category: string, severity: Severity, platform: string, target: string, action: IpsAction, policy: string, cve: string, protocol: string, description: string, enabled?: boolean];

// IDs are invented; CVE numbers are real public identifiers. Descriptions say what is detected, never how.
const ROWS: Row[] = [
  ["2101023", "Apache Log4j JNDI lookup remote code execution", "Web Applications", "Critical", "Server", "Server", "Drop", "Server Protection", "CVE-2021-44228", "HTTP / TCP 80, 443", "Detects HTTP requests that try to trigger a remote JNDI lookup in a vulnerable Log4j 2 logger."],
  ["2103471", "SMBv1 EternalBlue remote code execution", "Windows", "Critical", "Windows", "Server", "Drop", "Server Protection", "CVE-2017-0144", "SMB / TCP 445", "Detects malformed SMBv1 transactions used by the EternalBlue exploit (MS17-010)."],
  ["2102208", "Citrix ADC / Gateway path traversal", "Web Servers", "Critical", "Server", "Server", "Drop", "Server Protection", "CVE-2019-19781", "HTTPS / TCP 443", "Detects directory traversal requests against the Citrix ADC VPN portal."],
  ["2102951", "Citrix Bleed session token disclosure", "Web Servers", "Critical", "Server", "Server", "Drop", "Server Protection", "CVE-2023-4966", "HTTPS / TCP 443", "Detects oversized requests that leak session memory from NetScaler gateways."],
  ["2104188", "Spring4Shell class loader manipulation", "Web Applications", "Critical", "Server", "Server", "Drop", "Server Protection", "CVE-2022-22965", "HTTP / TCP 80, 8080", "Detects Spring Framework parameter binding abuse that writes web shells."],
  ["2104410", "SQL injection attempt in web request", "Web Applications", "High", "Server", "Server", "Drop", "Server Protection", "", "HTTP / TCP 80, 443", "Detects SQL meta-characters and set operators in request parameters."],
  ["2104733", "Apache Struts Content-Type OGNL injection", "Web Applications", "Critical", "Server", "Server", "Drop", "Server Protection", "CVE-2017-5638", "HTTP / TCP 80, 8080", "Detects OGNL expressions in the Content-Type header."],
  ["2105102", "ProxyShell Exchange autodiscover abuse", "Mail Servers", "Critical", "Windows", "Server", "Recommended", "Server Protection", "CVE-2021-34473", "HTTPS / TCP 443", "Detects crafted Autodiscover requests used to reach the Exchange backend."],
  ["2105260", "MOVEit Transfer SQL injection", "Web Applications", "High", "Server", "Server", "Drop", "Server Protection", "CVE-2023-34362", "HTTPS / TCP 443", "Detects injection attempts against the MOVEit guest access pages."],
  ["2105544", "SMTP command pipelining overflow attempt", "Mail Servers", "High", "Linux", "Server", "Recommended", "Server Protection", "", "SMTP / TCP 25", "Detects oversized or malformed SMTP command sequences."],
  ["2106015", "SSH brute force login attempts", "Brute Force", "Medium", "Linux", "Server", "Detect", "Server Protection", "", "SSH / TCP 22", "Counts repeated failed SSH authentications from one source.", false],
  ["2106188", "RDP brute force login attempts", "Brute Force", "Medium", "Windows", "Server", "Detect", "Server Protection", "", "RDP / TCP 3389", "Counts repeated failed RDP negotiations from one source."],
  ["2106420", "BlueKeep RDP channel use-after-free", "Windows", "Critical", "Windows", "Server", "Drop", "Server Protection", "CVE-2019-0708", "RDP / TCP 3389", "Detects the malformed MS_T120 channel binding used by BlueKeep."],
  ["2107008", "Shellshock environment variable injection", "Web Servers", "High", "Linux", "Server", "Drop", "Server Protection", "CVE-2014-6271", "HTTP / TCP 80", "Detects function definitions in HTTP headers passed to CGI scripts."],
  ["2107231", "Heartbleed TLS heartbeat over-read", "Web Servers", "High", "Any", "Server", "Drop", "Server Protection", "CVE-2014-0160", "TLS / TCP 443", "Detects heartbeat requests whose declared length exceeds the payload."],
  ["2107774", "Internet Explorer scripting engine memory corruption", "Browsers", "Medium", "Windows", "Client", "Recommended", "General Client Policy", "CVE-2018-8174", "HTTP / TCP 80", "Detects script content that triggers the VBScript engine use-after-free."],
  ["2107990", "Chromium V8 type confusion exploit page", "Browsers", "High", "Any", "Client", "Recommended", "General Client Policy", "CVE-2023-4863", "HTTPS / TCP 443", "Detects pages serving crafted image data that corrupts heap memory."],
  ["2108210", "Office document remote template injection", "Client Apps", "High", "Windows", "Client", "Drop", "General Client Policy", "CVE-2017-0199", "HTTP / TCP 80", "Detects documents that fetch an HTA payload through an OLE link."],
  ["2108892", "Cobalt Strike beacon check-in", "Malware", "High", "Any", "Client", "Drop", "General Client Policy", "", "HTTP / TCP 80, 443", "Detects the periodic check-in pattern of default Cobalt Strike HTTP listeners."],
  ["2108950", "Emotet C2 communication", "Malware", "Critical", "Windows", "Client", "Drop", "General Client Policy", "", "HTTP / TCP 8080", "Detects Emotet command-and-control request structure."],
  ["2109004", "Generic DNS tunnelling to long random hostnames", "Malware", "Medium", "Any", "Client", "Drop", "General Client Policy", "", "DNS / UDP 53", "Detects bursts of long, high-entropy DNS queries to one domain."],
  ["2109327", "BitTorrent peer handshake", "P2P", "Low", "Any", "Client", "Detect", "General Client Policy", "", "TCP / UDP", "Detects the BitTorrent protocol handshake."],
  ["2109410", "TOR relay connection setup", "P2P", "Medium", "Any", "Client", "Detect", "General Client Policy", "", "TLS / TCP 443, 9001", "Detects TLS handshakes with Tor relay certificate patterns."],
  ["2110015", "Cryptominer Stratum login", "Malware", "Medium", "Any", "Client", "Drop", "General Client Policy", "", "TCP 3333, 4444", "Detects Stratum mining protocol login messages."],
  ["2110322", "WannaCry kill-switch domain lookup", "Malware", "High", "Windows", "Client", "Drop", "General Client Policy", "", "DNS / UDP 53", "Detects the DNS lookup used by WannaCry before spreading."],
  ["2111001", "Lab: generic exploit kit landing page", "All", "Critical", "Any", "Any", "Detect", "Lab Monitor", "", "HTTP / TCP 80", "Logging-only signature group used in the lab policy."],
  ["2111002", "Lab: suspicious executable download", "All", "High", "Any", "Any", "Detect", "Lab Monitor", "", "HTTP / TCP 80", "Logging-only signature group used in the lab policy."],
];

function hitsFor(id: string): number[] {
  let seed = Number(id) % 2147483647 || 7;
  const next = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const base = 1 + Math.floor(next() * 40);
  return Array.from({ length: 12 }, () => Math.max(0, Math.round(base * (0.2 + next() * 1.6))));
}

export const SAMPLE_IPS_SIGNATURES: IpsSignature[] = ROWS.map(([id, name, category, severity, platform, target, action, policy, cve, protocol, description, enabled]) => ({
  id, name, category, severity, platform, target, action, policy, enabled: enabled ?? true, ...(cve ? { cve } : {}), protocol, description, updated: "2026-11-03", hits: hitsFor(id),
}));

/** Keep the real policy and coverage shape, but list the sample signature catalog. */
export const sampleIps = (base: IpsData | null): IpsData => ({
  kind: "catalog",
  policies: (base?.policies ?? []).map((policy) => {
    const mine = SAMPLE_IPS_SIGNATURES.filter((signature) => signature.policy === policy.name);
    const blocking = mine.filter((signature) => signature.action !== "Detect").length;
    return { ...policy, rules: mine.length, blocking, detectOnly: mine.length - blocking };
  }),
  signatures: SAMPLE_IPS_SIGNATURES,
  coverage: base?.coverage ?? [],
});
