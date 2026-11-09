import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Cloud, Globe, KeyRound, LayoutDashboard, LayoutGrid, ListChecks, Loader2, LockKeyhole, Mail, Network, RefreshCw, ShieldAlert, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IpsView } from "@/components/sophos-ips";
import { getFirewallSection } from "@/lib/firewall.functions";
import { useLanguage } from "@/lib/language";
import { headLanguage, pageHead } from "@/lib/seo";
import {
  FINDING_CATALOG, SECTION_META, SOPHOS_SECTIONS, cellText, isSophosSection, sophosLabel,
  type ConnectionState, type SectionResult, type SophosSectionId, type SourceError, type Tone,
} from "@/lib/sophos-catalog";
import type { Severity } from "@/lib/xdr-demo";

const TITLE = "Sophos Firewall Telemetry | SentinelGrid";
const DESCRIPTION = "Live, read-only Sophos Next-Gen Firewall dashboard: IP settings, policies, misconfigurations, DoS protection, web, application and email control, and Sophos Central sync.";

export const Route = createFileRoute("/xdr_/firewalls")({
  validateSearch: (search: Record<string, unknown>): { section?: SophosSectionId } => {
    const section = search["section"];
    return typeof section === "string" && isSophosSection(section) ? { section } : {};
  },
  head: (ctx) => {
    const base = pageHead({ path: "/xdr/firewalls", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx) });
    // Real firewall data sits behind an admin token: keep the page out of search results.
    return { ...base, meta: [...base.meta, { name: "robots", content: "noindex, nofollow" }] };
  },
  component: FirewallsPage,
});

const SECTION_ICON: Record<SophosSectionId, LucideIcon> = {
  overview: LayoutDashboard, basic: Network, policies: ListChecks, misconfig: AlertTriangle, dos: ShieldAlert, ips: ShieldCheck,
  web: Globe, apps: LayoutGrid, email: Mail, general: SlidersHorizontal, central: Cloud,
};
const TONE_TEXT: Record<Tone, string> = { ok: "text-clean", warn: "text-caution", bad: "text-malicious", info: "text-foreground" };
const SEVERITY_STYLE: Record<Severity, string> = {
  Critical: "text-malicious bg-malicious/10 border-malicious/25", High: "text-caution bg-caution/10 border-caution/25",
  Medium: "text-xdr-cloud bg-xdr-cloud/10 border-xdr-cloud/25", Low: "text-primary bg-primary/10 border-primary/25",
  Info: "text-muted-foreground bg-muted border-border",
};
const ERROR_KIND: Record<SourceError["kind"], readonly [string, string]> = {
  unsupported: ["Not supported on this firmware", "غير مدعوم في هذا الإصدار"],
  auth: ["Sign-in refused", "تم رفض تسجيل الدخول"],
  unreachable: ["Unreachable", "تعذر الوصول"],
  timeout: ["Timed out", "انتهت المهلة"],
  invalid: ["Invalid response", "استجابة غير صالحة"],
  config: ["Server configuration", "إعداد الخادم"],
  rate: ["Rate limited", "تم تجاوز الحد"],
};
const FIREWALL_ENV = ["SOPHOS_FW_HOST", "SOPHOS_FW_PORT (default 4444)", "SOPHOS_FW_USERNAME", "SOPHOS_FW_PASSWORD", "SOPHOS_FW_CA_CERT (optional)"];
const CENTRAL_ENV = ["SOPHOS_CENTRAL_CLIENT_ID", "SOPHOS_CENTRAL_CLIENT_SECRET"];

type GateCode = "invalid" | "locked" | "unconfigured";
type Load = { status: "loading" } | { status: "ready"; result: SectionResult } | { status: "failed" };

function FirewallsPage() {
  const { isArabic } = useLanguage();
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const { section = "overview" } = Route.useSearch();
  // The admin token lives in this component's memory only: never in storage, URLs or cookies.
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [gateError, setGateError] = useState<GateCode | null>(null);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const latest = useRef(0);

  const run = useCallback(async (secret: string, target: SophosSectionId, fresh: boolean) => {
    const id = ++latest.current;
    setLoad({ status: "loading" });
    try {
      const response = await getFirewallSection({ data: { token: secret, section: target, fresh } });
      if (id !== latest.current) return;
      if (!response.ok) {
        setToken(null);
        setGateError(response.code);
        return;
      }
      setLoad({ status: "ready", result: response.result });
    } catch {
      if (id === latest.current) setLoad({ status: "failed" });
    }
  }, []);

  // Probe once: when the server has no admin token configured it serves sample data, so no gate is needed.
  const probed = useRef(false);
  useEffect(() => {
    if (token !== null) {
      void run(token, section, false);
    } else if (!probed.current) {
      probed.current = true;
      void (async () => {
        try {
          const response = await getFirewallSection({ data: { token: "", section, fresh: false } });
          if (response.ok) setToken("");
        } catch {
          /* keep the gate */
        }
      })();
    }
  }, [token, section, run]);

  const unlock = (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setGateError(null);
    setDraft("");
    setToken(value);
  };
  const lock = () => {
    latest.current++;
    setToken(null);
    setGateError(null);
  };

  const gateMessage: Record<GateCode, string> = {
    invalid: l("That token is not correct.", "الرمز غير صحيح."),
    locked: l("Too many failed attempts. Try again in a few minutes.", "محاولات فاشلة كثيرة. حاول مرة أخرى بعد دقائق."),
    unconfigured: l("Admin access is not configured on the server. Set SOPHOS_ADMIN_TOKEN (16 or more characters).", "وصول المسؤول غير مُعدّ على الخادم. اضبط SOPHOS_ADMIN_TOKEN (16 حرفاً أو أكثر)."),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" data-no-translate>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/xdr" search={(prev) => prev} className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5 rtl:rotate-180" />{l("XDR Telemetry", "تكامل بيانات XDR")}
          </Link>
          <div className="mb-2 flex items-center gap-2 text-xs font-mono text-primary"><Network className="size-4" />{l("FIREWALLS · TELEMETRY", "الجدران النارية · القياس")}<span className="rounded border border-clean/30 bg-clean/10 px-2 py-0.5 text-clean">{l("Read-only", "قراءة فقط")}</span></div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{l("Sophos Firewall (NGFW)", "جدار Sophos الناري (NGFW)")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{l("Live settings read from the Sophos Firewall API and Sophos Central. Nothing here can change the firewall.", "إعدادات مباشرة تُقرأ من واجهة Sophos Firewall وSophos Central. لا شيء هنا يمكنه تغيير الجدار الناري.")}</p>
        </div>
        {token && <Button variant="outline" onClick={lock}><LockKeyhole />{l("Lock", "قفل")}</Button>}
      </div>

      {token === null ? (
        <form onSubmit={unlock} className="surface mx-auto mt-10 max-w-md space-y-4 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-primary" />{l("Admin access", "وصول المسؤول")}</div>
          <p className="text-sm text-muted-foreground">{l("Firewall data is private. Enter the admin token set on the server. It is kept in this tab's memory only.", "بيانات الجدار الناري خاصة. أدخل رمز المسؤول المضبوط على الخادم. يُحفظ في ذاكرة هذه التبويبة فقط.")}</p>
          <div className="space-y-2">
            <label htmlFor="fw-token" className="text-sm">{l("Admin token", "رمز المسؤول")}</label>
            <Input id="fw-token" type="password" autoComplete="off" spellCheck={false} dir="ltr" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={512} />
          </div>
          {gateError && <p role="alert" className="text-sm text-malicious">{gateMessage[gateError]}</p>}
          <Button type="submit" disabled={!draft.trim()}>{l("Unlock dashboard", "فتح لوحة التحكم")}</Button>
        </form>
      ) : (
        <div className="grid gap-8">
          <nav aria-label={l("Firewall sections", "أقسام الجدار الناري")} className="lg:hidden">
            <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {SOPHOS_SECTIONS.map((id) => {
                const Icon = SECTION_ICON[id];
                const active = id === section;
                return (
                  <li key={id} className="shrink-0">
                    <Link
                      to="/xdr/firewalls"
                      search={(prev) => ({ ...prev, section: id })}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
                    >
                      <Icon className={`size-4 ${active ? "text-primary" : ""}`} />{SECTION_META[id].title[isArabic ? 1 : 0]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-w-0" aria-live="polite">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{SECTION_META[section].title[isArabic ? 1 : 0]}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{SECTION_META[section].blurb[isArabic ? 1 : 0]}</p>
              </div>
              <div className="flex items-center gap-3">
                {load.status === "ready" && <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">{load.result.fetchedAt.slice(11, 19)} UTC</span>}
                <Button variant="outline" size="sm" disabled={load.status === "loading"} onClick={() => token !== null && void run(token, section, true)}>
                  <RefreshCw className={load.status === "loading" ? "animate-spin" : ""} />{l("Refresh", "تحديث")}
                </Button>
              </div>
            </div>

            {load.status === "loading" && <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" />{l("Reading from Sophos…", "جارٍ القراءة من Sophos…")}</p>}
            {load.status === "failed" && <p role="alert" className="border-s-2 border-malicious bg-malicious/5 p-4 text-sm">{l("Could not load this section. Try Refresh.", "تعذر تحميل هذا القسم. جرّب التحديث.")}</p>}
            {load.status === "ready" && <SectionView result={load.result} isArabic={isArabic} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ name, state, isArabic }: { name: string; state: ConnectionState; isArabic: boolean }) {
  if (state === "skipped") return null;
  const tone: Tone = state === "ok" ? "ok" : state === "error" ? "bad" : "info";
  const label = sophosLabel(state === "ok" ? "connected" : state === "error" ? "error" : "unconfigured", isArabic);
  return <span className="inline-flex items-center gap-2 rounded border border-border px-2.5 py-1 text-xs"><span className={`size-1.5 rounded-full ${tone === "ok" ? "bg-clean" : tone === "bad" ? "bg-malicious" : "bg-muted-foreground"}`} />{name}<span className={TONE_TEXT[tone]}>{label}</span></span>;
}

function SectionView({ result, isArabic }: { result: SectionResult; isArabic: boolean }) {
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const idx = isArabic ? 1 : 0;
  const { connections } = result;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <ConnectionBadge name={sophosLabel("fw.connection", isArabic)} state={connections.firewall} isArabic={isArabic} />
        <ConnectionBadge name={sophosLabel("central.connection", isArabic)} state={connections.central} isArabic={isArabic} />
      </div>

      {result.sample && result.sample.length > 0 && (
        <div role="status" className="border-s-2 border-primary bg-primary/5 p-4 text-sm">
          <p className="font-semibold">{l("Sample data", "بيانات تجريبية")}</p>
          <p className="mt-1 text-muted-foreground">{l(
            `Showing an example configuration for ${result.sample.map((s) => (s === "firewall" ? "the firewall" : "Sophos Central")).join(" and ")} because it is not connected yet. These values are invented and do not describe your network.`,
            "يتم عرض إعدادات مثال لأن المصدر غير متصل بعد. هذه القيم افتراضية ولا تصف شبكتك.",
          )}</p>
        </div>
      )}

      {(connections.firewall === "unconfigured" || connections.central === "unconfigured") && (
        <div className="space-y-4 border-s-2 border-caution bg-caution/5 p-4 text-sm">
          {connections.firewall === "unconfigured" && <EnvList title={l("Connect the firewall: set these server secrets", "اربط الجدار الناري: اضبط أسرار الخادم التالية")} names={FIREWALL_ENV} />}
          {connections.central === "unconfigured" && <EnvList title={l("Connect Sophos Central: set these server secrets", "اربط Sophos Central: اضبط أسرار الخادم التالية")} names={CENTRAL_ENV} />}
          <p className="text-xs text-muted-foreground">{l("Use a read-only API account. Secrets stay on the server and are never sent to the browser.", "استخدم حساب API للقراءة فقط. تبقى الأسرار على الخادم ولا تُرسل إلى المتصفح.")}</p>
        </div>
      )}

      {result.errors.length > 0 && (
        <section aria-label={l("Source errors", "أخطاء المصدر")} className="space-y-2">
          <h3 className="text-sm font-semibold">{l("Some data could not be read", "تعذرت قراءة بعض البيانات")}</h3>
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {result.errors.map((error, i) => (
              <li key={`${error.entity}-${i}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">{error.entity}</span>
                <span><span className="text-caution">{ERROR_KIND[error.kind][idx]}</span> <span className="text-muted-foreground" dir="ltr">{error.message}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.summary.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-5 sm:grid-cols-3 xl:grid-cols-4">
          {result.summary.map((item) => (
            <div key={item.id} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{sophosLabel(item.id, isArabic)}</dt>
              <dd className={`mt-1 break-words text-lg font-semibold ${TONE_TEXT[item.tone ?? "info"]}`} dir="auto">{cellText(item.value, isArabic)}</dd>
            </div>
          ))}
        </dl>
      )}

      {result.findings.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">{l("Findings", "النتائج")}</h3>
          <ul className="space-y-3">
            {result.findings.map((finding) => {
              const text = FINDING_CATALOG[finding.rule];
              return (
                <li key={finding.rule} className="surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[finding.severity]}`}>{sophosLabel(`ui.severity.${finding.severity}`, isArabic)}</span>
                    <h4 className="text-sm font-semibold">{text ? text.title[idx] : finding.rule}</h4>
                  </div>
                  {text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text.why[idx]}</p>}
                  {text && <p className="mt-2 text-sm leading-relaxed"><span className="font-medium text-primary">{l("Fix: ", "الحل: ")}</span>{text.fix[idx]}</p>}
                  {finding.subjects.length > 0 && (
                    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                      {finding.subjects.map((subject, i) => <span key={`${subject}-${i}`} className="rounded bg-muted px-2 py-0.5 font-mono" dir="auto">{cellText(subject, isArabic)}</span>)}
                      {finding.total > finding.subjects.length && <span className="text-muted-foreground">+{finding.total - finding.subjects.length}</span>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {result.section === "misconfig" && result.findings.length === 0 && result.connections.firewall === "ok" && (
        <p className="border-s-2 border-clean bg-clean/5 p-4 text-sm">{l("No misconfigurations found by the current checks.", "لم يتم العثور على أخطاء في الإعداد وفق الفحوصات الحالية.")}</p>
      )}

      {result.ips && <IpsView key={result.ips.kind} ips={result.ips} isArabic={isArabic} />}

      {result.tables.map((table) => (
        <section key={table.id}>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            {sophosLabel(table.id, isArabic)}
            <span className="font-mono text-xs font-normal text-muted-foreground" dir="ltr">{table.rows.length}{table.total > table.rows.length ? ` / ${table.total}` : ""}</span>
          </h3>
          {table.rows.length === 0 ? (
            <p className="border-y border-border py-6 text-sm text-muted-foreground">{l("No records.", "لا توجد سجلات.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[560px] text-start text-sm">
                <thead className="bg-panel text-[11px] text-muted-foreground">
                  <tr>{table.columns.map((column) => <th key={column} scope="col" className="px-4 py-3 text-start font-medium">{sophosLabel(column, isArabic)}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {table.rows.map((row, r) => (
                    <tr key={r}>{row.map((value, c) => <td key={c} className="max-w-[320px] break-words px-4 py-2.5 align-top text-xs" dir="auto">{cellText(value, isArabic)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {table.total > table.rows.length && <p className="mt-2 text-xs text-muted-foreground">{isArabic ? `يُعرض ${table.rows.length} من ${table.total}.` : `Showing ${table.rows.length} of ${table.total}.`}</p>}
        </section>
      ))}
    </div>
  );
}

function EnvList({ title, names }: { title: string; names: string[] }) {
  return (
    <div>
      <p className="font-semibold text-caution">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-2 font-mono text-xs" dir="ltr">{names.map((name) => <li key={name} className="rounded bg-muted px-2 py-1">{name}</li>)}</ul>
    </div>
  );
}
