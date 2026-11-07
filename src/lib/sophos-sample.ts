import type { Collected, CentralData } from "./sophos.server";
import type { XmlObject } from "./sophos-xml";

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

function rule(name: string, o: { status?: string; action: string; log?: string; src?: string[]; dst?: string[]; srcNet?: string[]; dstNet?: string[]; services?: string[] }): XmlObject {
  return {
    Name: name,
    Status: o.status ?? "Enable",
    NetworkPolicy: {
      Action: o.action,
      LogTraffic: o.log ?? "Enable",
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
      rule("Allow LAN to WAN", { action: "Accept", src: ["LAN"], dst: ["WAN"], srcNet: ["Office-LAN"], services: ["HTTP", "HTTPS", "DNS"] }),
      rule("Publish Web Server", { action: "Accept", src: ["WAN"], dst: ["DMZ"], srcNet: ["Any"], dstNet: ["DMZ-Web-01"], services: ["HTTP", "HTTPS"] }),
      rule("Mail Inbound", { action: "Accept", src: ["WAN"], dst: ["DMZ"], dstNet: ["DMZ-Mail-01"], services: ["SMTP"], log: "Disable" }),
      rule("Guest Internet", { action: "Accept", src: ["Guest"], dst: ["WAN"], srcNet: ["Guest-Range"], services: ["HTTP", "HTTPS", "DNS"] }),
      rule("Admin to DMZ", { action: "Accept", src: ["LAN"], dst: ["DMZ"], srcNet: ["Admin-Workstations"], services: ["SSH", "RDP"] }),
      rule("Temp Vendor Access", { action: "Accept", src: ["WAN"], dst: ["LAN"], srcNet: ["Any"], services: [] }),
      rule("Old Test Rule", { status: "Disable", action: "Accept", src: ["LAN"], dst: ["WAN"] }),
      rule("Block Guest to LAN", { action: "Drop", src: ["Guest"], dst: ["LAN"] }),
      rule("Default Deny", { action: "Drop", src: ["Any"], dst: ["Any"] }),
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
