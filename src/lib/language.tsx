import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

export type Language = "en" | "ar";

const ARABIC: Record<string, string> = {
  "XDR Telemetry": "بيانات XDR",
  "XDR Telemetry Settings | SentinelGrid": "إعدادات بيانات XDR | SentinelGrid",
  "Plan which firewalls, endpoint protection such as Kaspersky Security Center, Windows servers and cloud platforms feed your XDR telemetry. Safe, session-only setup drafts; nothing is connected.": "خطّط لمصادر بيانات XDR: الجدران النارية وحماية الأجهزة مثل Kaspersky Security Center وخوادم Windows ومنصات السحابة. مسودات إعداد آمنة لهذه الجلسة فقط ولا يتم ربط أي شيء.",
  "SOC Dashboard": "لوحة مركز العمليات الأمنية",
  "SOC Dashboard | SentinelGrid": "لوحة مركز العمليات الأمنية | SentinelGrid",
  "Security Operations Center dashboard: active threats, severity, MITRE ATT&CK tactics, endpoint health and telemetry coverage. Sample data only; no live connections.": "لوحة مركز العمليات الأمنية: التهديدات النشطة والخطورة وتكتيكات MITRE ATT&CK وصحة الأجهزة وتغطية البيانات. بيانات تجريبية فقط ودون اتصالات حقيقية.",
  "OSINT Hub": "مركز OSINT",
  "OWASP Scanner": "فاحص OWASP",
  Workflows: "مسارات العمل",
  "Attack Surface": "سطح الهجوم",
  "Threat Intel": "معلومات التهديدات",
  Contact: "تواصل معنا",
  Platform: "المنصة",
  Company: "الشركة",
  Legal: "قانوني",
  "OSINT Data Hub": "مركز بيانات OSINT",
  "Automation Workflows": "مسارات العمل الآلية",
  "Attack Surface Monitoring": "مراقبة سطح الهجوم",
  "Threat Intelligence": "معلومات التهديدات",
  "Privacy Policy": "سياسة الخصوصية",
  "Terms of Service": "شروط الخدمة",
  "Passive reconnaissance only.": "استطلاع سلبي فقط.",
  "Zero-key connectors · Evidence-first output": "مصادر بلا مفاتيح · نتائج مدعومة بالأدلة",
  "Passive reconnaissance · no keys required": "استطلاع سلبي · لا يحتاج إلى مفاتيح",
  "Turn scattered OSINT into a": "حوّل بيانات OSINT المتفرقة إلى",
  "decision you can defend": "قرار يمكنك الدفاع عنه",
  "Run a free scan": "شغّل فحصاً مجانياً",
  "keyless connectors": "مصادر بلا مفاتيح",
  "phishing triage SLA": "زمن فرز التصيد",
  "API keys to start": "مفاتيح API للبدء",
  "passive collection": "جمع سلبي",
  "The platform": "المنصة",
  "Five surfaces, one evidence trail": "خمس واجهات ومسار أدلة واحد",
  "Firewalls": "الجدران النارية",
  "Sophos Firewall (NGFW)": "جدار Sophos الناري (NGFW)",
  "Live, read-only view of your Sophos firewall: IP settings, policies, misconfigurations, DoS protection, web, application and email control, and Sophos Central sync.": "عرض مباشر للقراءة فقط لجدار Sophos الناري: إعدادات IP والسياسات والأخطاء في الإعداد والحماية من DoS والتحكم في الويب والتطبيقات والبريد ومزامنة Sophos Central.",
  "Open firewall dashboard": "فتح لوحة الجدار الناري",
  "Scan an indicator": "افحص مؤشراً",
  "Run a playbook": "شغّل مسار عمل",
  "See what we track": "شاهد ما نراقبه",
  "View latest CVEs": "عرض أحدث ثغرات CVE",
  Connectors: "مصادر البيانات",
  "Live sources, zero setup": "مصادر مباشرة بلا إعداد",
  FREE: "مجاني",
  "Playbooks that end in a recommendation": "مسارات عمل تنتهي بتوصية واضحة",
  "Explore workflows": "استكشف مسارات العمل",
  "Point it at one indicator and see the difference": "أدخل مؤشراً واحداً وشاهد الفرق",
  "Talk to sales": "تحدث مع المبيعات",
  "Flagship tool": "الأداة الرئيسية",
  "Targets — one per line": "الأهداف — هدف واحد في كل سطر",
  "Run hub scan": "بدء فحص OSINT",
  "Scanning…": "جارٍ الفحص…",
  "Data sources": "مصادر البيانات",
  Results: "النتائج",
  "Hide evidence": "إخفاء الأدلة",
  "Show evidence": "عرض الأدلة",
  "How the hub scores a target": "كيف يقيّم المركز الهدف",
  "Application security": "أمن التطبيقات",
  "OWASP Web Security Scanner": "فاحص أمان الويب OWASP",
  "Target URL or hostname": "رابط الهدف أو اسم النطاق",
  "Run OWASP scan": "بدء فحص OWASP",
  "JSON report": "تقرير JSON",
  Findings: "النتائج الأمنية",
  All: "الكل",
  "Why it matters": "لماذا هذا مهم",
  Remediation: "المعالجة",
  "Hide fix": "إخفاء الحل",
  "Show fix": "عرض الحل",
  "What each check covers": "ما الذي يغطيه كل فحص",
  Critical: "حرج",
  High: "مرتفع",
  Medium: "متوسط",
  Low: "منخفض",
  Info: "معلومة",
  queued: "في الانتظار",
  pass: "ناجح",
  Automation: "الأتمتة",
  "Workflows that end in a decision": "مسارات عمل تنتهي بقرار",
  Playbooks: "مسارات الفحص",
  "Run playbook": "تشغيل المسار",
  "Running…": "جارٍ التشغيل…",
  "Run result ·": "نتيجة التشغيل ·",
  Finished: "اكتمل",
  risk: "المخاطر",
  "Attack surface": "سطح الهجوم",
  "See your estate the way an attacker enumerates it": "شاهد أصولك كما يكتشفها المهاجم",
  "Baseline an asset now": "افحص أصلاً الآن",
  "What we track": "ما نراقبه",
  "Six signals, one changelog": "ست إشارات وسجل تغييرات واحد",
  "How it works": "كيف يعمل",
  "Is passive monitoring enough?": "هل المراقبة السلبية كافية؟",
  "Route diffs into a playbook": "أرسل التغييرات إلى مسار عمل",
  "Exposed services": "الخدمات المكشوفة",
  "Known vulnerabilities": "الثغرات المعروفة",
  "Certificate sprawl": "انتشار الشهادات",
  "DNS and mail posture": "وضع DNS والبريد",
  "Web hardening": "تحصين الويب",
  "Ownership attribution": "تحديد الملكية",
  "Threat intelligence": "معلومات التهديدات",
  "Vulnerabilities disclosed in the last 72 hours": "الثغرات المُعلن عنها خلال آخر 72 ساعة",
  Refresh: "تحديث",
  "Loading the feed…": "جارٍ تحميل البيانات…",
  "Does today's CVE touch anything you own?": "هل تؤثر ثغرات CVE اليوم على أي أصل تملكه؟",
  "Sweep your hosts": "افحص أجهزتك",
  unscored: "غير مقيّم",
  critical: "حرج",
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
  "Monthly scan quota": "حصة الفحص الشهرية",
  unlimited: "غير محدود",
  Resets: "تتجدد",
  "Contact SentinelGrid": "تواصل مع SentinelGrid",
  Sales: "المبيعات",
  Support: "الدعم",
  "Security disclosure": "الإبلاغ الأمني",
  "Direct contact": "تواصل مباشر",
  "Business hours": "ساعات العمل",
  "Phone / WhatsApp": "هاتف / واتساب",
  "SentinelGrid on Facebook": "SentinelGrid على Facebook",
  "Follow SentinelGrid on Facebook": "تابع SentinelGrid على Facebook",
  "New playbooks, CVE alerts and practical security guides, posted where you already are.": "مسارات عمل جديدة وتنبيهات CVE وأدلة أمنية عملية، تصلك حيث تتواجد بالفعل.",
  "Follow on Facebook": "تابعنا على Facebook",
  "Share this page": "شارك هذه الصفحة",
  "Share": "مشاركة",
  "Web Recon Guide": "دليل الاستطلاع على الويب",
  "Free Recon plan": "خطة Recon المجانية",
  "Start scanning": "ابدأ الفحص",
  "No account or payment required": "لا تحتاج إلى حساب أو وسيلة دفع",
  "What is included": "ما تتضمنه الخطة",
  "All 5 keyless OSINT connectors": "جميع مصادر OSINT الخمسة بلا مفاتيح",
  "Phishing triage playbook": "مسار فرز التصيد الاحتيالي",
  "JSON + CSV evidence export": "تصدير الأدلة بصيغتي JSON وCSV",
  "Community support": "دعم المجتمع",
  "25 scans / month · 1 seat": "25 فحصاً شهرياً · مستخدم واحد",
  "What we collect": "ما نجمعه",
  "How scan data is used": "كيف نستخدم بيانات الفحص",
  Retention: "الاحتفاظ بالبيانات",
  "Third parties": "الأطراف الخارجية",
  "Your rights": "حقوقك",
  "Acceptable use": "الاستخدام المقبول",
  "No intrusive testing": "لا اختبارات تدخّلية",
  Accuracy: "الدقة",
  Liability: "المسؤولية",
  Terms: "الشروط",
  "Tell us what you're trying to defend": "أخبرنا بما تحاول حمايته",
  "Enterprise pricing, procurement paperwork and pilots.": "أسعار المؤسسات وإجراءات الشراء والتجارب الأولية.",
  "Found something in our platform? Tell us first.": "وجدت مشكلة أمنية في منصتنا؟ أخبرنا أولاً.",
  "Egypt time, 11:00 AM – 3:00 PM.": "بتوقيت مصر، من 11:00 صباحاً إلى 3:00 مساءً.",
  "For Enterprise pricing, pilots and procurement.": "لأسعار المؤسسات والتجارب وإجراءات الشراء.",
  "For account, plan and technical questions.": "لأسئلة الحساب والخطة والدعم التقني.",
  "Report a vulnerability responsibly and privately.": "أبلغ عن ثغرة أمنية بمسؤولية وخصوصية.",
  "One indicator, every connector queried concurrently, normalised into a single verdict with the raw evidence kept alongside it.": "مؤشر واحد، وفحص متزامن عبر كل المصادر، ثم نتيجة موحدة مع الاحتفاظ بالأدلة الأصلية.",
  "Playbooks chain lookups into a decision — phishing triage, vendor due diligence, incident enrichment — and return a recommendation, not a data dump.": "تجمع مسارات العمل عمليات البحث للوصول إلى قرار — من فرز التصيد إلى تقييم الموردين وإثراء الحوادث — وتقدم توصية لا مجرد بيانات.",
  "Track ports, CVEs, certificates and subdomain sprawl across your estate, and get alerted on the diff instead of the inventory.": "راقب المنافذ وCVEs والشهادات والنطاقات الفرعية، واحصل على تنبيه عند التغيير بدلاً من مراجعة قائمة ثابتة.",
  "A live view of newly disclosed vulnerabilities so you know whether today's CVE touches anything you actually run.": "عرض مباشر للثغرات المُعلن عنها حديثاً لتعرف إن كانت CVE اليوم تؤثر على أنظمتك.",
  "Every source below is queried in parallel and works without an account or API key.": "يتم فحص كل مصدر بالتوازي ويعمل من دون حساب أو مفتاح API.",
  "No signup, no keys, no intrusive testing — just passive public data, normalised.": "بلا تسجيل أو مفاتيح أو اختبارات تدخّلية — فقط بيانات عامة سلبية ومنظمة.",
  "Passive OSINT, attack-surface monitoring and decision-ready automation for security teams that are drowning in alerts.": "OSINT سلبي ومراقبة لسطح الهجوم وأتمتة جاهزة للقرار لفرق الأمن المثقلة بالتنبيهات.",
  "Open the OSINT hub": "فتح مركز OSINT",
  "No route to host": "الصفحة غير موجودة",
  "That page doesn't exist or has been retired. Try the OSINT hub instead.": "هذه الصفحة غير موجودة أو أُزيلت. جرّب مركز OSINT بدلاً منها.",
  "This page didn't load": "تعذر تحميل الصفحة",
  "Try again": "حاول مرة أخرى",
  "Go home": "العودة للرئيسية",
  "SentinelGrid — OSINT Data Hub & Attack Surface Intelligence": "SentinelGrid — مركز OSINT ومعلومات سطح الهجوم",
  "Run passive OSINT lookups across five keyless sources, automate triage playbooks and monitor your attack surface. Free, no signup, no API keys.": "نفّذ عمليات بحث OSINT سلبية عبر خمسة مصادر بلا مفاتيح، وأتمت مسارات الفرز وراقب سطح الهجوم. مجاني وبلا تسجيل وبلا مفاتيح API.",
  "Contact SentinelGrid — Sales, Support & Security Reports": "تواصل مع SentinelGrid — المبيعات والدعم والبلاغات الأمنية",
  "Talk to the SentinelGrid team about Enterprise terms, managed triage retainers, custom connectors or responsible disclosure.": "تواصل مع فريق SentinelGrid بشأن خطط المؤسسات أو الدعم أو المصادر المخصصة أو الإبلاغ المسؤول.",
  "Privacy Policy | SentinelGrid": "سياسة الخصوصية | SentinelGrid",
  "Terms of Service | SentinelGrid": "شروط الخدمة | SentinelGrid",
  "How SentinelGrid collects, stores and retains scan data, account information and evidence exports.": "كيفية جمع SentinelGrid لبيانات الفحص ومعلومات الحساب وحفظها.",
  "Acceptable use, passive-collection limits and liability for the SentinelGrid OSINT platform.": "الاستخدام المقبول وحدود الجمع السلبي والمسؤولية في منصة SentinelGrid.",
  "This policy explains what SentinelGrid stores when you run a scan and how long we keep it.": "توضح هذه السياسة ما تحتفظ به SentinelGrid عند إجراء فحص ومدة الاحتفاظ به.",
  "Account details you provide (name, work email, organisation), the indicators you submit for scanning, and the results returned by public data sources. We do not collect the content of your internal systems.": "نجمع بيانات الحساب التي تقدمها، والمؤشرات التي ترسلها للفحص، والنتائج الواردة من المصادر العامة. لا نجمع محتوى أنظمتك الداخلية.",
  "Submitted indicators are sent to the public sources you select in order to fulfil your request, and the normalised result is stored so you keep an evidence trail. We do not sell scan data or use it to build a resale intelligence product.": "تُرسل المؤشرات إلى المصادر العامة التي تختارها لتنفيذ طلبك، وتُحفظ النتيجة المنظمة للاحتفاظ بمسار الأدلة. لا نبيع بيانات الفحص.",
  "Free-tier results are retained for 7 days, Team SOC for 12 months, and Enterprise for the term agreed in contract. You can export or purge results at any time from your workspace.": "تُحفظ نتائج الخطة المجانية 7 أيام، وخطة Team SOC لمدة 12 شهراً، والمؤسسات حسب المدة المتفق عليها. يمكنك تصدير النتائج أو حذفها في أي وقت.",
  "Scans transit to the public sources you enable — registry operators, DNS resolvers, certificate transparency aggregators and exposure databases. Those operators see the indicator you queried.": "تمر الفحوصات عبر المصادر العامة التي تفعّلها، مثل السجلات وخوادم DNS وسجلات الشهادات وقواعد بيانات التعرض. ترى هذه الجهات المؤشر المطلوب.",
  "You may request access, correction, export or deletion of your personal data at any time. Enterprise customers can additionally select a data residency region.": "يمكنك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو تصديرها أو حذفها في أي وقت. ويمكن لعملاء المؤسسات اختيار منطقة تخزين البيانات.",
  "By using SentinelGrid you agree to the terms below.": "باستخدام SentinelGrid فإنك توافق على الشروط التالية.",
  "SentinelGrid performs passive reconnaissance against publicly published data only. You may not use it to harass individuals, to stage intrusive testing, or to aggregate personal data about private persons.": "تجري SentinelGrid استطلاعاً سلبياً للبيانات المنشورة علناً فقط. لا يجوز استخدامها لمضايقة الأفراد أو إجراء اختبارات تدخّلية أو جمع بيانات شخصية عن أشخاص.",
  "The platform issues no exploit traffic and no authenticated probing. Nothing in the service constitutes authorisation to test infrastructure you do not own.": "لا ترسل المنصة أي استغلالات ولا تجري فحصاً موثقاً. لا تمنحك الخدمة إذناً لاختبار بنية لا تملكها.",
  "Results are derived from third-party public sources and reflect what those sources published at query time. Verdicts are decision support, not a warranty about a target's security.": "تأتي النتائج من مصادر عامة خارجية وتعكس ما نشرته وقت البحث. النتائج أداة لدعم القرار وليست ضماناً لأمان الهدف.",
  "The service is provided as is. To the maximum extent permitted by law, our aggregate liability is limited to the fees paid in the twelve months preceding a claim.": "تُقدم الخدمة كما هي. وفي أقصى حدود القانون، تقتصر مسؤوليتنا الإجمالية على الرسوم المدفوعة خلال الاثني عشر شهراً السابقة للمطالبة.",
  "Open ports, service fingerprints and known CVEs for an IP address.": "المنافذ المفتوحة وبصمات الخدمات وثغرات CVE المعروفة لعنوان IP.",
  "Authoritative registration, ownership and domain-age data.": "بيانات موثوقة عن التسجيل والملكية وعمر النطاق.",
  "A, MX, NS and TXT records including SPF spoofing posture.": "سجلات A وMX وNS وTXT، بما فيها وضع حماية SPF.",
  "Subdomain discovery from every publicly issued TLS certificate.": "اكتشاف النطاقات الفرعية من شهادات TLS المنشورة علناً.",
  "HSTS, CSP, clickjacking and content-type protections.": "حماية HSTS وCSP ومنع clickjacking وحماية نوع المحتوى.",
  "Register your assets": "سجّل أصولك",
  "Baseline the surface": "أنشئ خط أساس للسطح",
  "Watch the diff": "راقب التغييرات",
  "Route the change": "وجّه التغيير",
  "Paste IPs and domains, or sync them from an existing CMDB export.": "ألصق عناوين IP والنطاقات أو زامنها من ملف CMDB موجود.",
  "The first sweep records ports, CVEs, certificates and headers as your reference state.": "يسجل الفحص الأول المنافذ وCVEs والشهادات والترويسات كحالة مرجعية.",
  "Daily re-scans compare against the baseline and only surface what changed.": "تقارن الفحوصات اليومية بخط الأساس ولا تعرض إلا ما تغير.",
  "Diffs trigger a playbook and land in email, webhook or your SIEM as a decision.": "تشغّل التغييرات مسار عمل وتصل إلى البريد أو webhook أو SIEM كقرار واضح.",
  "and": "و",
  "Free OSINT Lookup Tool for IPs & Domains | SentinelGrid": "أداة OSINT مجانية للبحث عن عناوين IP والنطاقات | SentinelGrid",
  "Look up an IP or domain across Shodan InternetDB, RDAP, DNS, certificate transparency and HTTP security headers at once. Free, keyless, passive OSINT.": "ابحث عن عنوان IP أو نطاق عبر Shodan InternetDB وRDAP وDNS وشفافية الشهادات وترويسات أمان HTTP دفعة واحدة. استطلاع OSINT سلبي ومجاني وبلا مفاتيح.",
  "Free OWASP Web Security Scanner Online | SentinelGrid": "فاحص أمان المواقع OWASP مجاني أونلاين | SentinelGrid",
  "Scan any website against OWASP Top 10 checks: security headers, CORS, cookie flags, exposed files, injection signatures, SPF/DMARC email protection and mixed content — with severity ranking and fixes.": "افحص أي موقع وفق فحوصات OWASP Top 10: ترويسات الأمان وCORS وخصائص ملفات تعريف الارتباط والملفات المكشوفة وأنماط الحقن وحماية البريد SPF/DMARC والمحتوى المختلط — مع ترتيب الخطورة وخطوات المعالجة.",
  "Security Automation Playbooks for SOC Triage | SentinelGrid": "مسارات أتمتة أمنية لفرز حوادث SOC | SentinelGrid",
  "Automated OSINT playbooks for phishing triage, vendor due diligence, attack-surface review and incident enrichment — each ends in a clear recommendation.": "مسارات OSINT آلية لفرز التصيد الاحتيالي وتقييم الموردين ومراجعة سطح الهجوم وإثراء الحوادث، وينتهي كل مسار بتوصية واضحة.",
  "Attack Surface Monitoring for External Assets | SentinelGrid": "مراقبة سطح الهجوم للأصول الخارجية | SentinelGrid",
  "Map internet-facing hosts, open ports, known CVEs, certificate sprawl and missing security headers — and get alerted on the change, not the inventory.": "ارسم خريطة الأجهزة المكشوفة على الإنترنت والمنافذ المفتوحة وثغرات CVE المعروفة وانتشار الشهادات وترويسات الأمان الناقصة، واحصل على تنبيه عند التغيير لا عند كل قائمة جرد.",
  "Latest CVE Feed & Vulnerability Intelligence | SentinelGrid": "أحدث ثغرات CVE ومعلومات الثغرات | SentinelGrid",
  "A live feed of vulnerabilities disclosed in the last 72 hours, scored by CVSS, with a direct path from a CVE to whether your own exposed hosts are affected.": "بث مباشر للثغرات المُعلن عنها خلال آخر 72 ساعة مرتبة حسب درجة CVSS، مع طريق مباشر لمعرفة ما إذا كانت أجهزتك المكشوفة متأثرة بأي ثغرة CVE.",
  "Web Reconnaissance Guide for Kali Linux | SentinelGrid": "دليل الاستطلاع على الويب باستخدام Kali Linux | SentinelGrid",
  "A 10-step web reconnaissance guide for Kali Linux: passive OSINT, subdomain enumeration, live hosts, hidden paths and reporting. Authorized testing only.": "دليل من 10 خطوات للاستطلاع على الويب باستخدام Kali Linux: OSINT السلبي، وتعداد النطاقات الفرعية، والأجهزة الحية، والمسارات المخفية، وإعداد التقرير. للاختبار المصرّح به فقط.",
};

interface LanguageContextValue {
  language: Language;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function translateText(text: string): string {
  const exact = ARABIC[text];
  if (exact) return exact;
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = text.trim();
  if (ARABIC[core]) return `${leading}${ARABIC[core]}${trailing}`;
  let translated = core;
  for (const [english, arabic] of Object.entries(ARABIC).sort(([a], [b]) => b.length - a.length)) {
    if (english.length > 5 && translated.includes(english)) translated = translated.replaceAll(english, arabic);
  }
  return translated === core ? text : `${leading}${translated}${trailing}`;
}

let reverseDictionary: Map<string, string> | null = null;

/** Inverse of translateText for whole strings: used to put an English page title or description back. */
export function untranslateText(text: string): string {
  if (!reverseDictionary) {
    reverseDictionary = new Map(Object.entries(ARABIC).map(([english, arabic]) => [arabic, english]));
  }
  return reverseDictionary.get(text) ?? reverseDictionary.get(text.trim()) ?? text;
}

const LANGUAGE_STORAGE_KEY = "sentinelgrid-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start in English so server and first client render match; the real language is applied in an effect.
  const [language, setLanguage] = useState<Language>("en");
  const [ready, setReady] = useState(false);
  const originals = useRef(new Map<Text, string>());
  const syncedUrlFor = useRef<Language | null>(null);
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const urlLanguage = useLocation({
    select: (location) => ((location.search as { lang?: unknown } | undefined)?.lang === "ar" ? "ar" : "en"),
  });

  // Pick the language: an explicit ?lang= in the URL wins (shared and crawled links), then the saved choice.
  useEffect(() => {
    let initial: Language = "en";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("lang");
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      initial = fromUrl === "ar" || fromUrl === "en" ? fromUrl : stored === "ar" ? "ar" : "en";
    } catch {
      // Storage can be blocked (private mode); stay on English.
    }
    setLanguage(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Not persisted; the language still applies for this visit.
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language, pathname, ready]);

  // Keep the address bar in step with the language so the page can be shared and indexed as Arabic.
  // Links keep ?lang=ar themselves (retainSearchParams on the root route), so this mostly runs on toggle.
  useEffect(() => {
    if (!ready || urlLanguage === language) {
      syncedUrlFor.current = null;
      return;
    }
    // One attempt per language change: never fight the router in a loop.
    if (syncedUrlFor.current === language) return;
    syncedUrlFor.current = language;
    void navigate({
      to: ".",
      search: ((previous: Record<string, unknown>) => ({
        ...previous,
        lang: language === "ar" ? "ar" : undefined,
      })) as never,
      replace: true,
      resetScroll: false,
    });
  }, [language, urlLanguage, ready, navigate]);

  useEffect(() => {
    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const parent = textNode.parentElement;
        if (!parent || parent.closest("code, pre, textarea, script, style, [data-no-translate]")) return;
        const original = originals.current.get(textNode) ?? textNode.data;
        if (!originals.current.has(textNode)) originals.current.set(textNode, original);
        const next = language === "ar" ? translateText(original) : original;
        if (textNode.data !== next) textNode.data = next;
        return;
      }
      node.childNodes.forEach(translateNode);
    };

    // The server already renders Arabic title/description for ?lang=ar. Convert whole strings in
    // either direction, and only write when something changes so this observer can never retrigger itself.
    const convert = language === "ar" ? translateText : untranslateText;
    const syncHead = () => {
      const title = convert(document.title);
      if (title !== document.title) document.title = title;
      document
        .querySelectorAll<HTMLMetaElement>(
          'meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]',
        )
        .forEach((meta) => {
          const content = convert(meta.content);
          if (content !== meta.content) meta.content = content;
        });
    };

    translateNode(document.body);
    syncHead();

    const bodyObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) mutation.addedNodes.forEach(translateNode);
    });
    const headObserver = new MutationObserver(syncHead);
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      bodyObserver.disconnect();
      headObserver.disconnect();
    };
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isArabic: language === "ar",
      setLanguage,
      t: (text) => (language === "ar" ? translateText(text) : text),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
