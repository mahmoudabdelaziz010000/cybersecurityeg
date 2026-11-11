import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, GitBranch, Loader2, Play, Radar, ShieldAlert, ShieldCheck } from "lucide-react";
import { headLanguage, pageHead } from "@/lib/seo";
import { useLanguage } from "@/lib/language";
import { runHubScan } from "@/lib/osint.functions";
import { SOURCE_CATALOG, type HubResult } from "@/lib/osint-catalog";
import { OWASP_CHECKS, type CheckResult } from "@/lib/owasp-catalog";
import { recordOwaspScan, runOwaspCheck, startOwaspScan } from "@/lib/owasp.functions";
import { getRecentCves } from "@/lib/cve.functions";
import type { CveItem } from "@/lib/cve.server";
import { PLAYBOOKS, type WorkflowRun } from "@/lib/playbooks";
import { runPlaybook } from "@/lib/workflows.functions";

const TITLE = "Security Assessment Center | SentinelGrid";
const DESCRIPTION = "Run real OSINT, OWASP and vulnerability intelligence checks from one authorized security assessment workflow.";

export const Route = createFileRoute("/assessment-center")({
  head: (ctx) => ({ ...pageHead({ path: "/assessment-center", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx), type: "website" }) }),
  component: AssessmentCenter,
});

type ModuleId = "osint" | "owasp" | "cves" | "workflow";
const MODULES: { id: ModuleId; title: readonly [string, string]; detail: readonly [string, string]; icon: typeof Radar }[] = [
  { id: "osint", title: ["OSINT exposure lookup", "فحص التعرض عبر OSINT"], detail: ["Live DNS, RDAP, certificate and public host data", "بيانات مباشرة لـ DNS وRDAP والشهادات والمضيفات العامة"], icon: Radar },
  { id: "owasp", title: ["OWASP web checks", "فحوصات OWASP للويب"], detail: ["Non-destructive checks against a website you own or are authorized to test", "فحوصات آمنة لموقع تملكه أو لديك تصريح بفحصه"], icon: ShieldAlert },
  { id: "cves", title: ["Recent vulnerability feed", "تغذية الثغرات الحديثة"], detail: ["Current public NVD disclosures", "إفصاحات NVD العامة الحديثة"], icon: Activity },
  { id: "workflow", title: ["Investigation workflow", "سير عمل التحقيق"], detail: ["Chain free public lookups into an evidence-backed decision", "اربط عمليات البحث العامة المجانية بقرار مدعوم بالأدلة"], icon: GitBranch },
];

function AssessmentCenter() {
  const { isArabic } = useLanguage();
  const l = (en: string, ar: string) => isArabic ? ar : en;
  const pair = (v: readonly [string, string]) => v[isArabic ? 1 : 0];
  const osintScan = useServerFn(runHubScan);
  const startOwasp = useServerFn(startOwaspScan);
  const checkOwasp = useServerFn(runOwaspCheck);
  const saveOwasp = useServerFn(recordOwaspScan);
  const fetchCves = useServerFn(getRecentCves);
  const executePlaybook = useServerFn(runPlaybook);
  const [target, setTarget] = useState("");
  const [selected, setSelected] = useState<ModuleId[]>(["osint", "owasp", "cves", "workflow"]);
  const [playbook, setPlaybook] = useState(PLAYBOOKS[0]!.slug);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [osint, setOsint] = useState<HubResult | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [cves, setCves] = useState<CveItem[]>([]);
  const [cveError, setCveError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [moduleErrors, setModuleErrors] = useState<Partial<Record<ModuleId, string>>>({});
  const [workflow, setWorkflow] = useState<WorkflowRun | null>(null);

  const toggle = (id: ModuleId) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (running || !selected.length) return;
    if ((selected.includes("osint") || selected.includes("owasp") || selected.includes("workflow")) && !target.trim()) {
      setError(l("Enter a domain, IP address or website to assess.", "أدخل نطاقاً أو عنوان IP أو موقعاً لتقييمه."));
      return;
    }
    setRunning(true); setError(null); setCveError(null); setModuleErrors({}); setWorkflow(null); setOsint(null); setChecks([]); setCves([]); setHasRun(false);
    const cleanTarget = target.trim();
    const captureFailure = (id: ModuleId, failure: unknown) => setModuleErrors((current) => ({ ...current, [id]: failure instanceof Error ? failure.message : l("Source request failed", "فشل طلب المصدر") }));
    try {
      if (selected.includes("osint")) {
        try {
        setProgress(l("Querying public OSINT sources…", "جارٍ الاستعلام من مصادر OSINT العامة…"));
        const response = await osintScan({ data: { targets: [cleanTarget.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]], sources: SOURCE_CATALOG.map((s) => s.id) } });
        setOsint(response.results[0] ?? null);
        } catch (failure) { captureFailure("osint", failure); }
      }
      if (selected.includes("owasp")) {
        try {
        setProgress(l("Validating target and starting OWASP checks…", "جارٍ التحقق من الهدف وبدء فحوصات OWASP…"));
        const { target: normalized } = await startOwasp({ data: { target: cleanTarget } });
        const collected: CheckResult[] = [];
        for (const meta of OWASP_CHECKS) {
          setProgress(`${l("OWASP check", "فحص OWASP")}: ${meta.label} (${collected.length + 1}/${OWASP_CHECKS.length})`);
          const result = await checkOwasp({ data: { target: normalized, checkId: meta.id } });
          collected.push(result); setChecks([...collected]);
        }
        await saveOwasp({ data: { target: normalized, findings: collected.flatMap((r) => r.findings.map((f) => ({ severity: f.severity }))) } }).catch(() => undefined);
        } catch (failure) { captureFailure("owasp", failure); }
      }
      if (selected.includes("cves")) {
        try {
        setProgress(l("Loading the current public CVE feed…", "جارٍ تحميل تغذية CVE العامة الحالية…"));
        const response = await fetchCves(); setCves(response.items); setCveError(response.error);
        if (response.error) captureFailure("cves", response.error);
        } catch (failure) { captureFailure("cves", failure); }
      }
      if (selected.includes("workflow")) {
        try {
          setProgress(l("Running the selected investigation workflow…", "جارٍ تشغيل سير التحقيق المحدد…"));
          setWorkflow(await executePlaybook({ data: { slug: playbook, target: cleanTarget } }));
        } catch (failure) { captureFailure("workflow", failure); }
      }
      setProgress("");
      setHasRun(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : l("Assessment failed. Please try again.", "تعذر إكمال التقييم. حاول مجدداً."));
    } finally { setRunning(false); setHasRun(true); }
  }

  const findings = checks.flatMap((r) => r.findings);
  const complete = hasRun || Boolean(osint || checks.length || cves.length || cveError);
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
    <header className="surface relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -end-12 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl">
        <p className="label-mono flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />{l("TOOLS · CENTRAL ASSESSMENT", "الأدوات · مركز التقييم الموحد")}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{l("Security Assessment Center", "مركز التقييم الأمني")}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{l("Run the existing OSINT, OWASP and vulnerability intelligence tools together and review live evidence in one place. Choose the checks that fit your assessment.", "شغّل أدوات OSINT وOWASP واستخبارات الثغرات الحالية معاً وراجع الأدلة المباشرة في مكان واحد. اختر الفحوصات المناسبة لتقييمك.")}</p>
      </div><span className="inline-flex items-center gap-2 rounded-full border border-clean/30 bg-clean/10 px-3 py-1.5 text-xs text-clean"><CircleDot className="size-3" />{l("Live server-backed sources", "مصادر مباشرة عبر الخادم")}</span></div>
    </header>

    <form onSubmit={run} className="surface mt-6 p-5 sm:p-6">
      <label htmlFor="assessment-target" className="label-mono">{l("ASSESSMENT TARGET", "هدف التقييم")}</label>
      <input id="assessment-target" value={target} onChange={(e) => setTarget(e.target.value)} spellCheck={false} placeholder="example.com or https://example.com" className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-ring" />
      <p className="mt-2 text-xs text-muted-foreground">{l("Only assess assets you own or have permission to test. OWASP uses limited, non-destructive requests; private and loopback hosts are blocked.", "افحص الأصول التي تملكها أو لديك تصريح بفحصها فقط. تستخدم فحوصات OWASP طلبات محدودة وآمنة، وتُحظر العناوين الخاصة والمحلية.")}</p>
      <fieldset className="mt-5"><legend className="label-mono">{l("TOOLS TO RUN", "الأدوات المطلوب تشغيلها")}</legend><div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MODULES.map(({ id, title, detail, icon: Icon }) => <label key={id} className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${selected.includes(id) ? "border-primary/40 bg-primary/5" : "border-border hover:bg-accent/40"}`}><input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} className="mt-1 accent-primary" /><Icon className="mt-0.5 size-4 shrink-0 text-primary" /><span><span className="block text-sm font-medium">{pair(title)}</span><span className="mt-1 block text-xs text-muted-foreground">{pair(detail)}</span></span></label>)}
      </div></fieldset>
      {selected.includes("workflow") && <div className="mt-4 max-w-lg"><label htmlFor="assessment-playbook" className="label-mono">{l("WORKFLOW", "سير العمل")}</label><select id="assessment-playbook" value={playbook} onChange={(e) => setPlaybook(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{PLAYBOOKS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="submit" disabled={running || !selected.length} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}{running ? l("Running assessment…", "جارٍ تشغيل التقييم…") : l("Run assessment", "تشغيل التقييم")}</button><Link to="/osint-hub" className="text-sm text-primary hover:underline">{l("Open OSINT Hub", "فتح مركز OSINT")} <ArrowUpRight className="inline size-4" /></Link><Link to="/owasp" className="text-sm text-primary hover:underline">{l("Open OWASP Scanner", "فتح فاحص OWASP")} <ArrowUpRight className="inline size-4" /></Link></div>
      {progress && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 className="size-4 animate-spin text-primary" />{progress}</p>}
      {error && <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-malicious"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{error}</p>}
    </form>

    {complete && <section className="mt-8 space-y-4" aria-live="polite"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-clean" /><h2 className="text-xl font-semibold">{l("Assessment results", "نتائج التقييم")}</h2></div>
      {moduleErrors.osint && <p className="surface p-4 text-sm text-caution">OSINT: {moduleErrors.osint}</p>}
      {osint && <article className="surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="label-mono">OSINT · {osint.type}</p><h3 className="mt-1 font-mono text-lg">{osint.target}</h3></div><span className="rounded-full border border-border px-3 py-1 font-mono text-xs">{osint.verdict.toUpperCase()} · {osint.score}/100</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{osint.sources.map((s) => <div key={s.id} className="rounded-md border border-border p-3"><div className="flex justify-between gap-2 text-sm font-medium"><span>{s.label}</span><span className={s.ok ? "text-clean" : "text-caution"}>{s.ok ? l("Live", "مباشر") : s.error ?? l("Unavailable", "غير متاح")}</span></div>{s.facts.slice(0, 4).map((f) => <p key={f.key} className="mt-1 text-xs text-muted-foreground">{f.key}: <span className="font-mono text-foreground">{f.value}</span></p>)}</div>)}</div></article>}
      {moduleErrors.owasp && <p className="surface p-4 text-sm text-caution">OWASP: {moduleErrors.owasp}</p>}
      {checks.length > 0 && <article className="surface p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="label-mono">OWASP WEB CHECKS</p><h3 className="mt-1 font-semibold">{checks.length}/{OWASP_CHECKS.length} {l("checks completed", "فحوصات مكتملة")}</h3></div><span className="font-mono text-xs text-muted-foreground">{findings.length} {l("findings", "نتيجة")}</span></div>{findings.length ? <ul className="mt-4 divide-y divide-border">{findings.map((f) => <li key={f.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-caution/40 bg-caution/10 px-2 py-0.5 text-[10px] uppercase text-caution">{f.severity}</span><span className="text-sm font-medium">{f.title}</span></div><p className="mt-1 text-xs text-muted-foreground">{f.evidence}</p><p className="mt-1 text-xs">{f.remediation}</p></li>)}</ul> : <p className="mt-4 text-sm text-clean">{l("No findings in the completed checks.", "لم تُكتشف نتائج في الفحوصات المكتملة.")}</p>}{checks.some((c) => !c.ok) && <p className="mt-3 text-xs text-caution">{l("Some checks could not complete; see individual tool for details.", "تعذر إكمال بعض الفحوصات؛ راجع الأداة لمعرفة التفاصيل.")}</p>}</article>}
      {selected.includes("cves") && <article className="surface p-5"><p className="label-mono">NVD · LIVE PUBLIC FEED</p><h3 className="mt-1 font-semibold">{cves.length} {l("recent disclosures", "إفصاحات حديثة")}</h3>{(cveError || moduleErrors.cves) && <p className="mt-2 text-sm text-caution">{l("Feed unavailable", "التغذية غير متاحة")}: {cveError ?? moduleErrors.cves}</p>}<ul className="mt-3 divide-y divide-border">{cves.slice(0, 10).map((c) => <li key={c.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{c.id}</span><span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase">{c.severity}{c.score !== null ? ` · ${c.score.toFixed(1)}` : ""}</span></div><p className="mt-1 text-sm text-muted-foreground">{c.summary}</p></li>)}</ul></article>}
      {moduleErrors.workflow && <p className="surface p-4 text-sm text-caution">{l("Workflow", "سير العمل")}: {moduleErrors.workflow}</p>}
      {workflow && <article className="surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="label-mono">{l("WORKFLOW RESULT", "نتيجة سير العمل")}</p><h3 className="mt-1 font-semibold">{workflow.playbook} · <span className="font-mono">{workflow.target}</span></h3></div><span className="rounded-full border border-border px-3 py-1 font-mono text-xs">{workflow.verdict.toUpperCase()} · {workflow.score}/100</span></div><p className="mt-4 rounded-md border border-border bg-background p-3 text-sm">{workflow.recommendation}</p><ul className="mt-3 divide-y divide-border">{workflow.steps.map((step) => <li key={step.id} className="py-3"><p className="text-sm font-medium">{step.title} · {step.status}</p>{step.findings.map((finding) => <p key={finding} className="mt-1 text-xs text-muted-foreground">{finding}</p>)}{step.facts.map((fact) => <p key={fact.key} className="mt-1 text-xs text-muted-foreground">{fact.key}: <span className="font-mono text-foreground">{fact.value}</span></p>)}</li>)}</ul></article>}
    </section>}
    <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="label-mono">{l("TOOLS DIRECTORY", "دليل الأدوات")}</p><h2 className="mt-2 text-2xl font-semibold">{l("All security tools in one workspace", "جميع الأدوات الأمنية في مساحة واحدة")}</h2></div><Link to="/platform" className="text-sm text-primary hover:underline">{l("Platform overview", "نظرة عامة على المنصة")} <ArrowUpRight className="inline size-4" /></Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
      { to: "/osint-hub" as const, title: "OSINT Hub", note: l("Live public DNS, RDAP, certificate, headers and InternetDB lookups.", "عمليات بحث عامة مباشرة في DNS وRDAP والشهادات والرؤوس وInternetDB."), action: l("Open OSINT Hub", "فتح مركز OSINT") },
      { to: "/owasp" as const, title: "OWASP Scanner", note: l("Authorized, limited, non-destructive web checks.", "فحوصات ويب محدودة وآمنة للأصول المصرح بها."), action: l("Open OWASP Scanner", "فتح فاحص OWASP") },
      { to: "/workflows" as const, title: l("Workflows", "سير العمل"), note: l("Run public-source investigation playbooks; results are available above.", "شغّل خطط تحقيق بالمصادر العامة؛ تظهر النتائج أعلاه."), action: l("Open workflows", "فتح سير العمل") },
      { to: "/attack-surface" as const, title: l("Attack Surface", "سطح الهجوم"), note: l("Use passive public data to baseline a domain or IP; no scheduled monitoring is implied.", "استخدم البيانات العامة السلبية لتقييم نطاق أو عنوان IP؛ لا توجد مراقبة مجدولة."), action: l("Open attack surface", "فتح سطح الهجوم") },
      { to: "/threat-intel" as const, title: l("Threat Intel", "استخبارات التهديدات"), note: l("Live public NVD vulnerability disclosures.", "إفصاحات ثغرات NVD العامة المباشرة."), action: l("Open threat intel", "فتح استخبارات التهديدات") },
      { to: "/ips" as const, title: l("IPS Security Center", "مركز أمن IPS"), note: l("Guides and a browser-only simulated lab; it does not connect to a live sensor.", "أدلة ومختبر محاكاة داخل المتصفح؛ لا يتصل بمستشعر مباشر."), action: l("Open IPS center", "فتح مركز IPS") },
      { to: "/platform" as const, title: l("Platform Overview", "نظرة عامة على المنصة"), note: l("Product capabilities, data sources and workflow overview.", "نظرة على قدرات المنتج ومصادر البيانات وسير العمل."), action: l("Open overview", "فتح النظرة العامة") },
    ].map((tool) => <Link key={tool.to} to={tool.to} className="surface group p-4 transition-colors hover:border-primary/40"><h3 className="font-semibold">{tool.title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{tool.note}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">{tool.action}<ArrowUpRight className="size-3.5" /></span></Link>)}</div></section>
    <p className="mt-8 text-xs text-muted-foreground">{l("Results are gathered through existing server-side integrations. External sources can rate-limit or fail; incomplete checks are shown as such. No credentials are entered or stored here.", "تُجمع النتائج عبر التكاملات الحالية من جهة الخادم. قد تحد المصادر الخارجية الطلبات أو تتعطل؛ وتُعرض الفحوصات غير المكتملة بوضوح. لا تُدخل أو تُحفظ بيانات اعتماد هنا.")}</p>
  </div>;
}
