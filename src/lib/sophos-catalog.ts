/**
 * Browser-safe catalog for the Sophos firewall dashboard: section list, shared result types
 * and English/Arabic labels. The server fills these shapes in (`sophos.server.ts`); the UI
 * only looks labels up here. Nothing in this file touches credentials or the network.
 */
import type { Localized, Severity } from "./xdr-demo";

export const SOPHOS_SECTIONS = ["overview", "basic", "policies", "misconfig", "dos", "web", "apps", "email", "general", "central"] as const;
export type SophosSectionId = (typeof SOPHOS_SECTIONS)[number];
export function isSophosSection(value: string): value is SophosSectionId {
  return (SOPHOS_SECTIONS as readonly string[]).includes(value);
}

export const SECTION_META: Record<SophosSectionId, { title: Localized; blurb: Localized }> = {
  overview: { title: ["Overview", "نظرة عامة"], blurb: ["Connection state and the most important findings across the firewall.", "حالة الاتصال وأهم النتائج في الجدار الناري."] },
  basic: { title: ["Basic settings", "الإعدادات الأساسية"], blurb: ["Interfaces, zones, IP hosts, static routes and DNS.", "الواجهات والمناطق وعناوين IP والمسارات الثابتة وDNS."] },
  policies: { title: ["Firewall policies", "سياسات الجدار الناري"], blurb: ["Firewall rules and NAT rules in evaluation order.", "قواعد الجدار الناري وقواعد NAT بترتيب التقييم."] },
  misconfig: { title: ["Misconfiguration", "الأخطاء في الإعداد"], blurb: ["Risky settings found by checking the live configuration.", "إعدادات خطرة تم اكتشافها بفحص الإعدادات الفعلية."] },
  dos: { title: ["DoS attacks", "هجمات DoS"], blurb: ["Flood limits, hardening switches and spoof prevention.", "حدود الإغراق ومفاتيح التحصين ومنع الانتحال."] },
  web: { title: ["Web control", "التحكم في الويب"], blurb: ["Web filter policies and their category rules.", "سياسات تصفية الويب وقواعد الفئات."] },
  apps: { title: ["Applications control", "التحكم في التطبيقات"], blurb: ["Application filter policies and their rules.", "سياسات تصفية التطبيقات وقواعدها."] },
  email: { title: ["Email", "البريد الإلكتروني"], blurb: ["SMTP policies: spam, malware, file type and data protection.", "سياسات SMTP: الرسائل المزعجة والبرمجيات الخبيثة وأنواع الملفات وحماية البيانات."] },
  general: { title: ["General settings", "الإعدادات العامة"], blurb: ["Administration settings and device access rules.", "إعدادات الإدارة وقواعد الوصول إلى الجهاز."] },
  central: { title: ["Sophos Central", "Sophos Central"], blurb: ["Firewalls registered in Sophos Central and their sync state.", "الجدران النارية المسجلة في Sophos Central وحالة المزامنة."] },
};

/* ---------- result shapes (server -> UI) ---------- */

export type Tone = "ok" | "warn" | "bad" | "info";
export type ConnectionState = "ok" | "error" | "unconfigured" | "skipped";
export type SummaryItem = { id: string; value: string; tone?: Tone };
export type TableData = { id: string; columns: string[]; rows: string[][]; total: number };
export type Finding = { rule: string; severity: Severity; subjects: string[]; total: number };
export type SourceError = { entity: string; kind: "unsupported" | "auth" | "unreachable" | "timeout" | "invalid" | "config" | "rate"; message: string };
export type SectionResult = {
  section: SophosSectionId;
  fetchedAt: string;
  connections: { firewall: ConnectionState; central: ConnectionState };
  summary: SummaryItem[];
  tables: TableData[];
  findings: Finding[];
  errors: SourceError[];
};

/* ---------- labels ---------- */

export const LABELS: Record<string, Localized> = {
  // summary
  "fw.connection": ["Firewall API", "واجهة الجدار الناري"],
  "central.connection": ["Sophos Central API", "واجهة Sophos Central"],
  "count.rules": ["Firewall rules", "قواعد الجدار الناري"],
  "count.rulesEnabled": ["Enabled rules", "القواعد المفعّلة"],
  "count.accept": ["Accept rules", "قواعد السماح"],
  "count.drop": ["Drop / reject rules", "قواعد الحظر / الرفض"],
  "count.nat": ["NAT rules", "قواعد NAT"],
  "count.interfaces": ["Interfaces", "الواجهات"],
  "count.zones": ["Zones", "المناطق"],
  "count.hosts": ["IP hosts", "عناوين IP"],
  "count.routes": ["Static routes", "المسارات الثابتة"],
  "count.webPolicies": ["Web filter policies", "سياسات تصفية الويب"],
  "count.appPolicies": ["Application policies", "سياسات التطبيقات"],
  "count.smtpPolicies": ["SMTP policies", "سياسات SMTP"],
  "count.accessRules": ["Device access rules", "قواعد الوصول للجهاز"],
  "count.findings": ["Findings", "النتائج"],
  "count.critical": ["Critical", "حرجة"],
  "count.high": ["High", "عالية"],
  "count.medium": ["Medium", "متوسطة"],
  "count.low": ["Low / info", "منخفضة / معلومات"],
  "dos.floodOn": ["Flood protections on", "حماية الإغراق المفعّلة"],
  "dos.spoof": ["Spoof prevention", "منع الانتحال"],
  "central.tenantType": ["Account type", "نوع الحساب"],
  "central.firewalls": ["Registered firewalls", "الجدران النارية المسجلة"],
  "central.disconnected": ["Disconnected", "غير متصلة"],
  // states
  connected: ["Connected", "متصل"],
  error: ["Error", "خطأ"],
  unconfigured: ["Not configured", "غير مُعدّ"],
  on: ["On", "مفعّل"],
  off: ["Off", "متوقف"],
  unknown: ["Unknown", "غير معروف"],
  // tables
  "table.interfaces": ["Interfaces", "الواجهات"],
  "table.zones": ["Zones", "المناطق"],
  "table.hosts": ["IP hosts and networks", "عناوين وشبكات IP"],
  "table.routes": ["Static routes", "المسارات الثابتة"],
  "table.dns": ["DNS settings", "إعدادات DNS"],
  "table.rules": ["Firewall rules", "قواعد الجدار الناري"],
  "table.nat": ["NAT rules", "قواعد NAT"],
  "table.dosFlood": ["Flood protection", "الحماية من الإغراق"],
  "table.dosOther": ["Network hardening", "تحصين الشبكة"],
  "table.spoof": ["Spoof prevention", "منع الانتحال"],
  "table.webPolicies": ["Web filter policies", "سياسات تصفية الويب"],
  "table.webRules": ["Web filter rules", "قواعد تصفية الويب"],
  "table.appPolicies": ["Application filter policies", "سياسات تصفية التطبيقات"],
  "table.appRules": ["Application filter rules", "قواعد تصفية التطبيقات"],
  "table.smtp": ["SMTP policies", "سياسات SMTP"],
  "table.admin": ["Administration settings", "إعدادات الإدارة"],
  "table.access": ["Device access rules", "قواعد الوصول للجهاز"],
  "table.centralFirewalls": ["Firewalls in Sophos Central", "الجدران النارية في Sophos Central"],
  // columns
  key: ["Setting", "الإعداد"],
  value: ["Value", "القيمة"],
  name: ["Name", "الاسم"],
  zone: ["Zone", "المنطقة"],
  type: ["Type", "النوع"],
  ipv4: ["IP address", "عنوان IP"],
  netmask: ["Netmask", "قناع الشبكة"],
  status: ["Status", "الحالة"],
  family: ["Family", "العائلة"],
  address: ["Address", "العنوان"],
  destination: ["Destination", "الوجهة"],
  gateway: ["Gateway", "البوابة"],
  interface: ["Interface", "الواجهة"],
  distance: ["Distance", "المسافة"],
  action: ["Action", "الإجراء"],
  source: ["Source", "المصدر"],
  services: ["Services", "الخدمات"],
  log: ["Logging", "التسجيل"],
  position: ["Position", "الترتيب"],
  direction: ["Direction", "الاتجاه"],
  packetRate: ["Packets / min", "حزم / دقيقة"],
  burstRate: ["Burst", "الاندفاع"],
  enabled: ["Enabled", "مفعّل"],
  protection: ["Protection", "الحماية"],
  setting: ["Setting", "الإعداد"],
  defaultAction: ["Default action", "الإجراء الافتراضي"],
  rules: ["Rules", "القواعد"],
  blocking: ["Deny rules", "قواعد المنع"],
  safeSearch: ["Safe search", "البحث الآمن"],
  youtube: ["YouTube restriction", "تقييد YouTube"],
  policy: ["Policy", "السياسة"],
  categories: ["Categories", "الفئات"],
  http: ["HTTP", "HTTP"],
  https: ["HTTPS", "HTTPS"],
  schedule: ["Schedule", "الجدول"],
  risk: ["Risk", "الخطورة"],
  microApps: ["Micro apps", "التطبيقات الدقيقة"],
  domains: ["Domains", "النطاقات"],
  spam: ["Spam protection", "الحماية من الرسائل المزعجة"],
  malware: ["Malware protection", "الحماية من البرمجيات الخبيثة"],
  zeroDay: ["Zero-day", "الحماية من هجمات اليوم الصفري"],
  fileFilter: ["File type filter", "تصفية أنواع الملفات"],
  dlp: ["Data protection", "حماية البيانات"],
  hosts: ["Hosts", "المضيفون"],
  hostname: ["Hostname", "اسم المضيف"],
  serial: ["Serial number", "الرقم التسلسلي"],
  model: ["Model", "الطراز"],
  firmware: ["Firmware", "البرنامج الثابت"],
  connectedCol: ["Connected", "متصل"],
  managing: ["Managing", "الإدارة"],
  health: ["Health", "الصحة"],
  changed: ["Last state change", "آخر تغيير للحالة"],
  // direction values
  "dir.source": ["Per source", "لكل مصدر"],
  "dir.destination": ["Per destination", "لكل وجهة"],
  "dos.syn": ["SYN flood", "إغراق SYN"],
  "dos.udp": ["UDP flood", "إغراق UDP"],
  "dos.tcp": ["TCP flood", "إغراق TCP"],
  "dos.icmp": ["ICMP flood", "إغراق ICMP"],
  "dos.sourceRouted": ["Drop source-routed packets", "إسقاط الحزم الموجهة من المصدر"],
  "dos.icmpRedirect": ["Disable ICMP redirects", "تعطيل إعادة توجيه ICMP"],
  "dos.arpFlood": ["Disable ARP flooding", "تعطيل إغراق ARP"],
  "spoof.enabled": ["Spoof prevention", "منع الانتحال"],
  "spoof.restrictUnknown": ["Restrict unknown IPs on trusted MACs", "تقييد عناوين IP غير المعروفة على MAC موثوق"],
  "spoof.ipZones": ["IP spoofing zones", "مناطق منع انتحال IP"],
  "spoof.macZones": ["MAC filter zones", "مناطق تصفية MAC"],
  "spoof.ipMacZones": ["IP-MAC filter zones", "مناطق تصفية IP-MAC"],
  // ui
  "ui.severity.Critical": ["Critical", "حرجة"],
  "ui.severity.High": ["High", "عالية"],
  "ui.severity.Medium": ["Medium", "متوسطة"],
  "ui.severity.Low": ["Low", "منخفضة"],
  "ui.severity.Info": ["Info", "معلومات"],
};

export function sophosLabel(id: string, arabic: boolean): string {
  const entry = LABELS[id];
  return entry ? entry[arabic ? 1 : 0] : id;
}

/**
 * Cells and summary values that should be translated start with this marker followed by a label id.
 * The server strips control characters from everything it did not write itself, so firewall data
 * can never impersonate a label.
 */
export const LABEL_MARK = "\u0001";
export const lbl = (id: string): string => `${LABEL_MARK}${id}`;
export function cellText(value: string, arabic: boolean): string {
  return value.startsWith(LABEL_MARK) ? sophosLabel(value.slice(1), arabic) : value;
}

/* ---------- misconfiguration rule catalog ---------- */

export type FindingText = { title: Localized; why: Localized; fix: Localized };
export const FINDING_CATALOG: Record<string, FindingText> = {
  "fw-any-any-accept": {
    title: ["Rule allows any traffic from anywhere to anywhere", "قاعدة تسمح بأي مرور من أي مكان إلى أي مكان"],
    why: ["An enabled Accept rule with Any source, destination, network and service makes every rule below it irrelevant and exposes all internal services.", "قاعدة سماح مفعّلة بمصدر ووجهة وشبكة وخدمة من النوع Any تلغي أثر القواعد التي تحتها وتكشف كل الخدمات الداخلية."],
    fix: ["Replace it with rules limited to the zones, networks and services that are actually needed.", "استبدلها بقواعد محدودة بالمناطق والشبكات والخدمات المطلوبة فعلاً."],
  },
  "fw-wan-accept-any-service": {
    title: ["Rule accepts any service from the WAN zone", "قاعدة تقبل أي خدمة قادمة من منطقة WAN"],
    why: ["Allowing every service from the internet side greatly enlarges the attack surface.", "السماح بكل الخدمات من جهة الإنترنت يوسّع سطح الهجوم بشكل كبير."],
    fix: ["Limit the rule to the specific services and destination hosts that must be published.", "قيّد القاعدة بالخدمات والمضيفين المطلوب نشرهم فقط."],
  },
  "fw-accept-no-log": {
    title: ["Accept rule does not log traffic", "قاعدة سماح لا تسجل المرور"],
    why: ["Without logging, allowed connections cannot be investigated after an incident.", "بدون التسجيل لا يمكن التحقيق في الاتصالات المسموحة بعد الحوادث."],
    fix: ["Enable Log firewall traffic on the rule.", "فعّل تسجيل مرور الجدار الناري في القاعدة."],
  },
  "fw-disabled-rules": {
    title: ["Disabled rules are still in the policy list", "قواعد معطّلة ما زالت في قائمة السياسات"],
    why: ["Old disabled rules make the policy harder to review and can be re-enabled by mistake.", "القواعد القديمة المعطّلة تصعّب المراجعة وقد تُفعّل بالخطأ."],
    fix: ["Review them and delete the ones that are no longer needed.", "راجعها واحذف ما لم يعد مطلوباً."],
  },
  "admin-wan-open": {
    title: ["Administration service open to the internet from any address", "خدمة إدارة مفتوحة للإنترنت من أي عنوان"],
    why: ["HTTPS or SSH administration reachable from the WAN zone for any host invites brute force and exploit attempts.", "إدارة HTTPS أو SSH المتاحة من منطقة WAN لأي مضيف تدعو لمحاولات التخمين والاستغلال."],
    fix: ["Disable WAN administration, or restrict it to trusted source IPs and use a VPN.", "عطّل الإدارة من WAN أو قيّدها بعناوين موثوقة واستخدم VPN."],
  },
  "admin-wan-restricted": {
    title: ["Administration service reachable from the WAN zone", "خدمة إدارة متاحة من منطقة WAN"],
    why: ["Access is limited to specific hosts, but the management plane is still exposed to the internet.", "الوصول مقيّد بمضيفين محددين لكن واجهة الإدارة ما زالت مكشوفة للإنترنت."],
    fix: ["Prefer VPN-only administration and keep the allowed host list as short as possible.", "فضّل الإدارة عبر VPN فقط وأبقِ قائمة المضيفين المسموحين قصيرة."],
  },
  "service-wan-exposed": {
    title: ["DNS or SNMP exposed to the internet", "DNS أو SNMP مكشوفة للإنترنت"],
    why: ["Open resolvers and SNMP agents are abused for amplification attacks and information disclosure.", "تُستغل خوادم DNS المفتوحة ووكلاء SNMP في هجمات التضخيم وكشف المعلومات."],
    fix: ["Remove these services from WAN device access or restrict them to known hosts.", "أزل هذه الخدمات من الوصول عبر WAN أو قيّدها بمضيفين معروفين."],
  },
  "dos-flood-off": {
    title: ["Flood protection is not enabled", "الحماية من الإغراق غير مفعّلة"],
    why: ["SYN, UDP, TCP or ICMP flood limits are off in both directions, so floods are not rate-limited.", "حدود إغراق SYN وUDP وTCP وICMP متوقفة في الاتجاهين فلا يتم تحديد معدل الإغراق."],
    fix: ["Enable per-source and per-destination limits under DoS & spoof protection.", "فعّل حدود المصدر والوجهة ضمن الحماية من DoS والانتحال."],
  },
  "dos-flood-partial": {
    title: ["Flood protection is enabled in one direction only", "الحماية من الإغراق مفعّلة في اتجاه واحد فقط"],
    why: ["Only the per-source or only the per-destination limit is active.", "حد المصدر فقط أو حد الوجهة فقط هو المفعّل."],
    fix: ["Enable both directions unless there is a specific reason not to.", "فعّل الاتجاهين ما لم يوجد سبب محدد."],
  },
  "dos-hardening-off": {
    title: ["Network hardening switches are off", "مفاتيح تحصين الشبكة متوقفة"],
    why: ["Source-routed packets, ICMP redirects and ARP flooding are common building blocks of spoofing and man-in-the-middle attacks.", "الحزم الموجهة من المصدر وإعادة توجيه ICMP وإغراق ARP من أدوات الانتحال وهجمات الوسيط."],
    fix: ["Turn these protections on.", "فعّل هذه الحمايات."],
  },
  "spoof-off": {
    title: ["Spoof prevention is disabled", "منع الانتحال معطّل"],
    why: ["Packets with forged source addresses are not checked against the interface they arrive on.", "لا يتم فحص الحزم ذات عناوين المصدر المزورة مقابل الواجهة التي وصلت منها."],
    fix: ["Enable spoof prevention and select the zones to protect.", "فعّل منع الانتحال واختر المناطق المراد حمايتها."],
  },
  "spoof-no-zones": {
    title: ["Spoof prevention is on but protects no zone", "منع الانتحال مفعّل لكنه لا يحمي أي منطقة"],
    why: ["The feature is enabled, but no zone has IP spoofing protection selected.", "الميزة مفعّلة لكن لا توجد منطقة محددة لحماية انتحال IP."],
    fix: ["Select at least the WAN and untrusted zones.", "اختر على الأقل منطقة WAN والمناطق غير الموثوقة."],
  },
  "web-no-blocking": {
    title: ["Web filter policy blocks nothing", "سياسة تصفية الويب لا تمنع شيئاً"],
    why: ["The default action is Allow and no rule denies a category, so the policy does not filter.", "الإجراء الافتراضي هو السماح ولا توجد قاعدة تمنع فئة، فالسياسة لا تقوم بأي تصفية."],
    fix: ["Add deny rules for risky categories such as malware, phishing and anonymizers.", "أضف قواعد منع للفئات الخطرة مثل البرمجيات الخبيثة والتصيد وأدوات إخفاء الهوية."],
  },
  "app-no-blocking": {
    title: ["Application policy blocks nothing", "سياسة التطبيقات لا تمنع شيئاً"],
    why: ["The default action is Allow and no rule denies an application or category.", "الإجراء الافتراضي هو السماح ولا توجد قاعدة تمنع تطبيقاً أو فئة."],
    fix: ["Deny high-risk categories such as proxies, P2P and remote-access tools you do not use.", "امنع الفئات عالية الخطورة مثل الوسطاء وP2P وأدوات الوصول عن بعد غير المستخدمة."],
  },
  "email-spam-off": {
    title: ["SMTP policy has spam protection off", "سياسة SMTP بدون حماية من الرسائل المزعجة"],
    why: ["Inbound mail is not checked for spam or phishing at the firewall.", "لا يتم فحص البريد الوارد بحثاً عن الرسائل المزعجة والتصيد في الجدار الناري."],
    fix: ["Enable spam protection and a recipient verification method.", "فعّل الحماية من الرسائل المزعجة وطريقة التحقق من المستلم."],
  },
  "email-malware-off": {
    title: ["SMTP policy has malware protection off", "سياسة SMTP بدون حماية من البرمجيات الخبيثة"],
    why: ["Attachments are delivered without antivirus scanning at the firewall.", "تُسلَّم المرفقات دون فحص مضاد الفيروسات في الجدار الناري."],
    fix: ["Enable malware scanning (dual engine where licensed).", "فعّل فحص البرمجيات الخبيثة (محركان إن كان الترخيص يسمح)."],
  },
  "email-zeroday-off": {
    title: ["SMTP policy has zero-day protection off", "سياسة SMTP بدون حماية اليوم الصفري"],
    why: ["Unknown malware is not sent to sandbox analysis.", "لا تُرسل البرمجيات الخبيثة غير المعروفة إلى التحليل في بيئة معزولة."],
    fix: ["Enable zero-day protection if your subscription includes it.", "فعّل حماية اليوم الصفري إن كان اشتراكك يتضمنها."],
  },
  "email-recipient-verification-off": {
    title: ["SMTP policy does not verify recipients", "سياسة SMTP لا تتحقق من المستلمين"],
    why: ["Accepting mail for unknown recipients lets attackers harvest valid addresses and generates backscatter.", "قبول البريد لمستلمين غير موجودين يسمح بجمع العناوين الصحيحة ويولّد رسائل ارتدادية."],
    fix: ["Use callout or Active Directory recipient verification.", "استخدم التحقق بالاستدعاء أو عبر Active Directory."],
  },
  "central-disconnected": {
    title: ["Firewall is not connected to Sophos Central", "الجدار الناري غير متصل بـ Sophos Central"],
    why: ["Central cannot manage, report on or back up a firewall that is offline.", "لا يستطيع Central إدارة جدار ناري غير متصل أو إنشاء تقارير أو نسخ احتياطية له."],
    fix: ["Check the firewall's internet access and its Central registration.", "افحص اتصال الجدار الناري بالإنترنت وتسجيله في Central."],
  },
};

export const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
