import { GROUPS, PROVIDERS, type Group, type Localized, type Provider } from "./xdr-demo";
import { SOPHOS_SECTIONS, isSophosSection, type SophosSectionId } from "./sophos-catalog";

/**
 * Browser-safe navigation model for the console sidebar and the /telemetry/* pages.
 * Kept free of React so the URL rules can be unit-tested.
 */

export const SOPHOS_PROVIDER_ID = "sophos";
/** Path of the live, token-protected Sophos Firewall dashboard. */
export const SOPHOS_DASHBOARD_PATH = "/xdr/firewalls";

export const GROUP_SLUG: Record<Group, string> = {
  Firewalls: "firewalls",
  Endpoints: "endpoints",
  Servers: "servers",
  Cloud: "cloud",
  Network: "network",
  Email: "email",
  "AI APIs": "ai-apis",
  "Other APIs": "other-apis",
};

/** What each telemetry group covers, used as the intro text of its dashboard page (EN, AR). */
export const GROUP_BLURB: Record<Group, Localized> = {
  Firewalls: [
    "Traffic decisions, threat logs, policy hits and configuration risk from your network firewalls, including a live read-only Sophos Firewall (NGFW) dashboard.",
    "قرارات المرور وسجلات التهديدات وتطابق السياسات ومخاطر الإعداد من الجدران النارية، مع لوحة مباشرة للقراءة فقط لجدار Sophos الناري (NGFW).",
  ],
  Endpoints: [
    "Detections, device health and process evidence from endpoint protection such as Microsoft Defender, Kaspersky Security Center, CrowdStrike and SentinelOne.",
    "الكشوفات وصحة الأجهزة وأدلة العمليات من حماية الأجهزة الطرفية مثل Microsoft Defender وKaspersky Security Center وCrowdStrike وSentinelOne.",
  ],
  Servers: [
    "Security events, sign-ins and audit activity from Windows servers, Active Directory and Linux hosts.",
    "أحداث الأمان وتسجيلات الدخول ونشاط التدقيق من خوادم Windows وActive Directory وخوادم Linux.",
  ],
  Cloud: [
    "Audit logs, identity changes and security findings from AWS, Microsoft Azure and Google Cloud.",
    "سجلات التدقيق وتغييرات الهوية والنتائج الأمنية من AWS وMicrosoft Azure وGoogle Cloud.",
  ],
  Network: [
    "DNS, TLS, connection metadata and intrusion alerts from network sensors such as Zeek and Suricata.",
    "بيانات DNS وTLS والاتصالات وتنبيهات التسلل من مستشعرات الشبكة مثل Zeek وSuricata.",
  ],
  Email: [
    "Mailbox metadata, phishing detections and audit activity from Gmail and Google Workspace.",
    "بيانات البريد الوصفية وكشف التصيد ونشاط التدقيق من Gmail وGoogle Workspace.",
  ],
  "AI APIs": [
    "Request volume, model usage and error signals from AI APIs such as Gemini and OpenAI.",
    "حجم الطلبات واستخدام النماذج وإشارات الأخطاء من واجهات الذكاء الاصطناعي مثل Gemini وOpenAI.",
  ],
  "Other APIs": [
    "Custom webhooks and free threat-intelligence feeds normalised into the same event format.",
    "Webhooks مخصصة ومصادر استخبارات تهديدات مجانية موحّدة في صيغة الأحداث نفسها.",
  ],
};

export function groupFromSlug(slug: string): Group | undefined {
  return GROUPS.find((group) => GROUP_SLUG[group] === slug);
}

export function providersOf(group: Group): Provider[] {
  return PROVIDERS.filter((provider) => provider.group === group);
}

export type TelemetryTarget = { group: Group; provider?: Provider };

/**
 * Parse the splat of /telemetry/* ("firewalls" or "firewalls/paloalto").
 * Returns null for anything that is not a known group, or a provider of that group.
 */
export function parseTelemetryPath(splat: string | undefined): TelemetryTarget | null {
  const parts = (splat ?? "").split("/").filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return null;
  const group = groupFromSlug(parts[0] ?? "");
  if (!group) return null;
  if (parts.length === 1) return { group };
  const provider = providersOf(group).find((item) => item.id === parts[1]);
  return provider ? { group, provider } : null;
}

/** Splat value for the /telemetry/$ route. */
export function telemetrySplat(group: Group, provider?: Provider): string {
  return provider ? `${GROUP_SLUG[group]}/${provider.id}` : GROUP_SLUG[group];
}

/** Public path of a telemetry page, for sitemaps and canonical URLs. */
export function telemetryPath(group: Group, provider?: Provider): string {
  return `/telemetry/${telemetrySplat(group, provider)}`;
}

/**
 * Every indexable telemetry page: one per group and one per provider. Sophos is left out of the
 * provider pages because its live dashboard sits behind an admin token and is not indexed.
 */
export function allTelemetryPaths(): string[] {
  return GROUPS.flatMap((group) => [
    telemetryPath(group),
    ...providersOf(group)
      .filter((provider) => provider.id !== SOPHOS_PROVIDER_ID)
      .map((provider) => telemetryPath(group, provider)),
  ]);
}

export type NavActive = {
  /** Highlighted top-level item. */
  area: "soc" | "settings" | "telemetry" | "tool" | "none";
  group?: Group;
  providerId?: string;
  /** Sophos dashboard section, when on the live firewall page. */
  section?: SophosSectionId;
};

/** Work out which sidebar entries are active from the current URL. */
export function navActiveFor(pathname: string, sectionParam?: unknown): NavActive {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return { area: "soc" };
  if (path === "/xdr") return { area: "settings" };
  if (path === SOPHOS_DASHBOARD_PATH) {
    const section = typeof sectionParam === "string" && isSophosSection(sectionParam) ? sectionParam : SOPHOS_SECTIONS[0];
    return { area: "telemetry", group: "Firewalls", providerId: SOPHOS_PROVIDER_ID, section };
  }
  if (path.startsWith("/telemetry/")) {
    const target = parseTelemetryPath(path.slice("/telemetry/".length));
    if (target) return { area: "telemetry", group: target.group, ...(target.provider ? { providerId: target.provider.id } : {}) };
  }
  return { area: path === "/platform" || path === "/contact" || path === "/privacy" || path === "/terms" ? "none" : "tool" };
}
