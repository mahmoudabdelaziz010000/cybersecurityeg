import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, CheckCircle2, CircleDot, Database, Loader2, Search, ShieldAlert, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/language";
import { getThreatEnrichmentConfig, runThreatEnrichment } from "@/lib/threat-enrichment.functions";
import type { IndicatorResult, SourceResult } from "@/lib/threat-enrichment";

type Config = Record<SourceResult["source"], boolean>;
const SOURCES: SourceResult["source"][] = ["ThreatFox", "AbuseIPDB", "Pulsedive", "URLhaus"];

function stateLabel(source: SourceResult, configured: boolean, l: (en: string, ar: string) => string) {
  if (!configured || source.state === "unavailable") return l("Unavailable", "غير متاح");
  if (source.state === "error") return l("Request failed", "فشل الطلب");
  if (source.state === "matched") return l("Match", "تطابق");
  return l("No match", "لا يوجد تطابق");
}

function stateClass(source: SourceResult, configured: boolean) {
  if (!configured || source.state === "unavailable" || source.state === "error") return "text-caution";
  return source.state === "matched" ? "text-malicious" : "text-clean";
}

export function ThreatEnrichmentDashboard() {
  const { isArabic } = useLanguage();
  const l = (en: string, ar: string) => isArabic ? ar : en;
  const enrich = useServerFn(runThreatEnrichment);
  const getConfig = useServerFn(getThreatEnrichmentConfig);
  const [text, setText] = useState("");
  const [results, setResults] = useState<IndicatorResult[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void getConfig().then((response) => setConfig(response.sources as Config)).catch(() => setConfig(null)); }, [getConfig]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const indicators = text.split(/[\n,;\t]+/).map((item) => item.trim()).filter(Boolean);
    if (!indicators.length) { setError(l("Enter an IP, domain, URL, or file hash.", "أدخل عنوان IP أو نطاقاً أو رابطاً أو بصمة ملف.")); return; }
    if (indicators.length > 10) { setError(l("Enter up to 10 indicators per batch.", "أدخل حتى 10 مؤشرات في الدفعة الواحدة.")); return; }
    setRunning(true); setError(null); setResults([]);
    try {
      const response = await enrich({ data: { indicators } });
      setResults(response.results as IndicatorResult[]);
      setConfig(response.sources as Config);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : l("Enrichment request failed.", "فشل طلب الإثراء."));
    } finally { setRunning(false); }
  }

  const matched = results.filter((item) => item.findings.length > 0).length;
  const sourceMatches = SOURCES.reduce((count, name) => count + results.reduce((sum, item) => sum + Number(item.sources.find((source) => source.source === name)?.state === "matched"), 0), 0);
  const metrics: { label: string; value: number; icon: LucideIcon }[] = [
    { label: l("Indicators checked", "المؤشرات المفحوصة"), value: results.length, icon: Database },
    { label: l("Indicators with findings", "مؤشرات لها نتائج"), value: matched, icon: ShieldAlert },
    { label: l("Source matches", "تطابقات المصادر"), value: sourceMatches, icon: CheckCircle2 },
  ];

  return <section className="mt-8 space-y-5" aria-labelledby="threat-enrichment-title">
    <header className="surface relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -end-12 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><p className="label-mono flex items-center gap-2"><Activity className="size-4 text-primary" />{l("COMMUNITY INTELLIGENCE · MULTI-SOURCE", "استخبارات مجتمعية · مصادر متعددة")}</p>
          <h2 id="threat-enrichment-title" className="mt-2 text-2xl font-semibold">{l("Aggregated Threat Enrichment Engine", "محرك إثراء التهديدات الموحّد")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{l("Check IPs, domains, URLs and file hashes against ThreatFox, AbuseIPDB, Pulsedive and URLhaus. Each provider reports its own status; a missing match does not establish that an indicator is safe.", "افحص عناوين IP والنطاقات والروابط وبصمات الملفات في ThreatFox وAbuseIPDB وPulsedive وURLhaus. تظهر حالة كل مصدر على حدة؛ وعدم العثور على تطابق لا يثبت سلامة المؤشر.")}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"><Database className="size-3.5" />{l("Server-side lookups", "استعلامات عبر الخادم")}</span>
      </div>
      <div className="relative mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {SOURCES.map((source) => <div key={source} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-xs"><span className="font-medium">{source}</span><span className={`inline-flex items-center gap-1.5 ${config?.[source] ? "text-clean" : "text-caution"}`}><CircleDot className="size-3" />{config ? config[source] ? l("Configured", "مُعدّ") : l("Key required", "مفتاح مطلوب") : l("Checking", "جارٍ التحقق")}</span></div>)}
      </div>
      <p className="relative mt-3 text-xs text-muted-foreground">{l("API credentials stay on the server. Configure the provider keys in the deployment environment; none are entered in this page.", "تبقى مفاتيح API على الخادم. أضف مفاتيح المصادر إلى إعدادات بيئة الخادم؛ لا تُدخل المفاتيح في هذه الصفحة.")}</p>
    </header>

    <form onSubmit={submit} className="surface p-5 sm:p-6">
      <label htmlFor="threat-indicators" className="label-mono">{l("INDICATORS · ONE PER LINE", "المؤشرات · مؤشر واحد في كل سطر")}</label>
      <textarea id="threat-indicators" value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} rows={4} placeholder={"203.0.113.25\nexample.com\nhttps://example.com/path\n<MD5, SHA-1, or SHA-256>"} className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-ring" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{l("Up to 10 indicators per batch. Each lookup may send the indicator to the selected public intelligence providers.", "حتى 10 مؤشرات في الدفعة. قد يُرسل كل مؤشر إلى مزودي الاستخبارات العامة المُعدّين.")}</p><button type="submit" disabled={running} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{running ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{running ? l("Enriching indicators…", "جارٍ إثراء المؤشرات…") : l("Enrich indicators", "إثراء المؤشرات")}</button></div>
      {running && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin text-primary" />{l("Pulsedive requests are paced to respect its free-tier limit.", "تُباعد طلبات Pulsedive احتراماً لحدود الخطة المجانية.")}</p>}
      {error && <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-malicious"><AlertTriangle className="size-4" />{error}</p>}
    </form>

    {results.length > 0 && <>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        {metrics.map(({ label, value, icon: Icon }) => <article key={label} className="surface p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{label}</span><Icon className="size-4 text-primary" /></div><p className="mt-2 font-display text-2xl font-semibold">{value}</p></article>)}
      </div>
      <div className="space-y-4">{results.map((item) => <IndicatorCard key={item.indicator} item={item} config={config} l={l} />)}</div>
    </>}
  </section>;
}

function IndicatorCard({ item, config, l }: { item: IndicatorResult; config: Config | null; l: (en: string, ar: string) => string }) {
  const severityClass = item.severity === "critical" || item.severity === "high" ? "text-malicious border-malicious/40 bg-malicious/10" : item.severity === "unknown" ? "text-muted-foreground border-border" : "text-caution border-caution/40 bg-caution/10";
  return <article className="surface overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
      <div className="min-w-0"><p className="label-mono">{item.type.toUpperCase()}</p><h3 className="mt-1 break-all font-mono text-base font-semibold">{item.indicator}</h3><p className="mt-2 text-xs text-muted-foreground">{l("Enriched", "وقت الإثراء")}: <time dateTime={item.enrichedAt}>{new Date(item.enrichedAt).toLocaleString(l("en-US", "ar-EG"))}</time></p></div>
      <div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${severityClass}`}>{item.severity}</span><span className="rounded-full border border-border px-2.5 py-1 font-mono text-xs">{item.score}/100</span></div>
    </div>
    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">{SOURCES.map((name) => {
      const source = item.sources.find((entry) => entry.source === name)!;
      const configured = Boolean(config?.[name]);
      return <div key={name} className="min-w-0 rounded-md border border-border bg-background/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{name}</span><span className={`text-[10px] font-semibold uppercase ${stateClass(source, configured)}`}>{stateLabel(source, configured, l)}</span></div>
        <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{source.message}</p>
        {source.findings.map((finding) => <div key={finding.id} className="mt-3 border-t border-border pt-2"><p className="text-xs font-semibold">{finding.title}</p><p className="mt-1 break-words text-[11px] leading-4 text-muted-foreground">{finding.detail}</p>{finding.observedAt && <p className="mt-1 text-[10px] text-muted-foreground">{l("Observed", "رُصد")}: {finding.observedAt}</p>}{finding.reference && <a href={finding.reference} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-primary hover:underline">{l("Source evidence ↗", "دليل المصدر ↗")}</a>}</div>)}
      </div>;
    })}</div>
    <div className="border-t border-border bg-background/30 px-4 py-3 sm:px-5"><p className="text-xs font-medium">{l("Score rationale", "مبررات التقييم")}</p><ul className="mt-1 space-y-1">{item.rationale.map((reason) => <li key={reason} className="text-xs leading-5 text-muted-foreground">{reason}</li>)}</ul></div>
  </article>;
}

