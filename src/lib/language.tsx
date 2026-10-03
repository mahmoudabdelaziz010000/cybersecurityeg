import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Language = "en" | "ar";

const ARABIC: Record<string, string> = {
  "OSINT Hub": "مركز OSINT",
  "OWASP Scanner": "فاحص OWASP",
  Workflows: "مسارات العمل",
  "Attack Surface": "سطح الهجوم",
  "Threat Intel": "معلومات التهديدات",
  Pricing: "الأسعار",
  Contact: "تواصل معنا",
  "Sign in": "تسجيل الدخول",
  "Start free": "ابدأ مجاناً",
  Dashboard: "لوحة التحكم",
  "Open dashboard": "فتح لوحة التحكم",
  Platform: "المنصة",
  Company: "الشركة",
  Legal: "قانوني",
  "OSINT Data Hub": "مركز بيانات OSINT",
  "Automation Workflows": "مسارات العمل الآلية",
  "Attack Surface Monitoring": "مراقبة سطح الهجوم",
  "Threat Intelligence": "معلومات التهديدات",
  "Privacy Policy": "سياسة الخصوصية",
  "Terms of Service": "شروط الخدمة",
  "Refund Policy": "سياسة الاسترداد",
  "Passive reconnaissance only.": "استطلاع سلبي فقط.",
  "Zero-key connectors · Evidence-first output": "مصادر بلا مفاتيح · نتائج مدعومة بالأدلة",
  "Passive reconnaissance · no keys required": "استطلاع سلبي · لا يحتاج إلى مفاتيح",
  "Turn scattered OSINT into a": "حوّل بيانات OSINT المتفرقة إلى",
  "decision you can defend": "قرار يمكنك الدفاع عنه",
  "Run a free scan": "شغّل فحصاً مجانياً",
  "See pricing": "عرض الأسعار",
  "keyless connectors": "مصادر بلا مفاتيح",
  "phishing triage SLA": "زمن فرز التصيد",
  "API keys to start": "مفاتيح API للبدء",
  "passive collection": "جمع سلبي",
  "The platform": "المنصة",
  "Four surfaces, one evidence trail": "أربع واجهات ومسار أدلة واحد",
  "Scan an indicator": "افحص مؤشراً",
  "Run a playbook": "شغّل مسار عمل",
  "See what we track": "شاهد ما نراقبه",
  "View latest CVEs": "عرض أحدث ثغرات CVE",
  Connectors: "مصادر البيانات",
  "Live sources, zero setup": "مصادر مباشرة بلا إعداد",
  FREE: "مجاني",
  "Playbooks that end in a recommendation": "مسارات عمل تنتهي بتوصية واضحة",
  "Explore workflows": "استكشف مسارات العمل",
  "Start free, scale by volume": "ابدأ مجاناً وتوسع حسب الاستخدام",
  "Full comparison and add-ons →": "التفاصيل الكاملة ←",
  "Point it at one indicator and see the difference": "أدخل مؤشراً واحداً وشاهد الفرق",
  "Talk to sales": "تحدث مع المبيعات",
  "Flagship tool": "الأداة الرئيسية",
  "You're scanning as a guest — limited to 2 targets per run and no saved history.": "أنت تفحص كزائر — بحد أقصى هدفين في كل مرة ومن دون حفظ السجل.",
  "Create a free account": "أنشئ حساباً مجانياً",
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
  "You're scanning as a guest — results aren't saved.": "أنت تفحص كزائر — لن يتم حفظ النتائج.",
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
  "See monitoring pricing": "عرض أسعار المراقبة",
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
  Workspace: "مساحة العمل",
  Analyst: "المحلل",
  "Sign out": "تسجيل الخروج",
  "Monthly scan quota": "حصة الفحص الشهرية",
  unlimited: "غير محدود",
  Resets: "تتجدد",
  "Current plan": "الخطة الحالية",
  "Upgrade or buy credits": "الترقية أو شراء رصيد",
  "Compare plans": "مقارنة الخطط",
  Profile: "الملف الشخصي",
  "Display name": "اسم العرض",
  "Update name": "تحديث الاسم",
  "Saving…": "جارٍ الحفظ…",
  "Recent activity": "النشاط الأخير",
  "No scans yet.": "لا توجد فحوصات بعد.",
  "Run your first OSINT lookup": "شغّل أول فحص OSINT",
  Billing: "الفوترة",
  "Plan, credits and invoices": "الخطة والرصيد والفواتير",
  "Scan credits": "رصيد الفحص",
  "Need a bigger workspace?": "تحتاج إلى مساحة عمل أكبر؟",
  "See all plans": "عرض كل الخطط",
  Buy: "شراء",
  Checkout: "الدفع",
  "Payment history": "سجل المدفوعات",
  "No payments yet.": "لا توجد مدفوعات بعد.",
  "Resume payment": "استكمال الدفع",
  "Back to dashboard": "العودة إلى لوحة التحكم",
  "Contact SentinelGrid": "تواصل مع SentinelGrid",
  Sales: "المبيعات",
  Support: "الدعم",
  "Security disclosure": "الإبلاغ الأمني",
  "Direct contact": "تواصل مباشر",
  "Business hours": "ساعات العمل",
  "Phone / WhatsApp": "هاتف / واتساب",
  "SentinelGrid on Facebook": "SentinelGrid على Facebook",
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
  Subscriptions: "الاشتراكات",
  Liability: "المسؤولية",
  "14-day guarantee": "ضمان 14 يوماً",
  Renewals: "التجديدات",
  "Credit packs": "حزم الرصيد",
  Downgrades: "تخفيض الخطة",
  "How to request": "كيفية تقديم الطلب",
  "Sign in to your workspace": "تسجيل الدخول إلى مساحة العمل",
  "Create your analyst account": "إنشاء حساب محلل",
  "Continue with Google": "المتابعة باستخدام Google",
  "or use email": "أو استخدم البريد الإلكتروني",
  "Work email": "بريد العمل",
  Password: "كلمة المرور",
  "Create account": "إنشاء حساب",
  "No account yet?": "ليس لديك حساب؟",
  "Already registered?": "لديك حساب بالفعل؟",
  "Create one free": "أنشئ حساباً مجانياً",
  "Sign in instead": "سجل الدخول بدلاً من ذلك",
  Terms: "الشروط",
  "Tell us what you're trying to defend": "أخبرنا بما تحاول حمايته",
  "Enterprise pricing, procurement paperwork and pilots.": "أسعار المؤسسات وإجراءات الشراء والتجارب الأولية.",
  "Plan questions, billing and connector issues.": "أسئلة الخطط والفوترة ومشكلات مصادر البيانات.",
  "Found something in our platform? Tell us first.": "وجدت مشكلة أمنية في منصتنا؟ أخبرنا أولاً.",
  "Egypt time, 11:00 AM – 3:00 PM.": "بتوقيت مصر، من 11:00 صباحاً إلى 3:00 مساءً.",
  "For Enterprise pricing, pilots and procurement.": "لأسعار المؤسسات والتجارب وإجراءات الشراء.",
  "For account, plan and technical questions.": "لأسئلة الحساب والخطة والدعم التقني.",
  "Report a vulnerability responsibly and privately.": "أبلغ عن ثغرة أمنية بمسؤولية وخصوصية.",
  "Priced by volume, not by seat panic": "سعر يعتمد على حجم الاستخدام، لا عدد المقاعد",
  "Start free with every keyless connector. Upgrade when triage becomes a daily habit rather than an occasional errand.": "ابدأ مجاناً مع جميع المصادر التي لا تحتاج إلى مفاتيح. انتقل لخطة أكبر عندما يصبح الفرز جزءاً من عملك اليومي.",
  "Most popular": "الأكثر شيوعاً",
  "Add-ons": "الإضافات",
  "Attach revenue to what you use": "ادفع مقابل ما تستخدمه",
  "Pricing questions": "أسئلة الأسعار",
  "Need a quote for a regulated estate?": "تحتاج إلى عرض سعر لبيئة منظّمة؟",
  "Enterprise terms cover SSO, data residency, custom connectors and an uptime SLA.": "تشمل شروط المؤسسات SSO وموقع تخزين البيانات ومصادر مخصصة واتفاقية توفر الخدمة.",
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const originals = useRef(new Map<Text, string>());

  useEffect(() => {
    const stored = window.localStorage.getItem("sentinelgrid-language");
    if (stored === "ar") setLanguage("ar");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sentinelgrid-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const parent = textNode.parentElement;
        if (!parent || parent.closest("code, pre, textarea, [data-no-translate]")) return;
        const original = originals.current.get(textNode) ?? textNode.data;
        if (!originals.current.has(textNode)) originals.current.set(textNode, original);
        textNode.data = language === "ar" ? translateText(original) : original;
        return;
      }
      node.childNodes.forEach(translateNode);
    };

    translateNode(document.body);
    const title = document.title;
    if (language === "ar") document.title = translateText(title);
    document.querySelectorAll<HTMLMetaElement>('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]').forEach((meta) => {
      const original = meta.dataset["originalContent"] ?? meta.content;
      meta.dataset["originalContent"] = original;
      meta.content = language === "ar" ? translateText(original) : original;
    });

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(translateNode);
        if (language === "ar" && mutation.target instanceof HTMLTitleElement) {
          mutation.target.textContent = translateText(mutation.target.textContent ?? "");
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
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
