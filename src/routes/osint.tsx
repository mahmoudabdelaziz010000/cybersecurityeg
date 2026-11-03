import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowRight, CheckCircle2, Clock3, Database, Monitor, Plug, Radar, Search, ShieldAlert, Timer, TriangleAlert } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/lib/language";
import { headLanguage, pageHead } from "@/lib/seo";
import { FLEET, RESPONSE, SNAPSHOT_LABEL, THREAT_TREND_14D, fleetOnlinePercent, groupCoverage, openBySeverity, socMetrics, tacticBreakdown, topAssets } from "@/lib/soc-demo";
import { EVENTS, PROVIDERS, SEVERITIES, type Severity, type TelemetryEvent } from "@/lib/xdr-demo";
import { GROUP_STYLE, SEVERITY_COLOR, SEVERITY_STYLE, groupLabel } from "@/lib/xdr-ui";

const TITLE = "SOC Dashboard | SentinelGrid";
const DESCRIPTION =
  "Security Operations Center dashboard: active threats, severity, MITRE ATT&CK tactics, endpoint health and telemetry coverage. Sample data only; no live connections.";

export const Route = createFileRoute("/osint")({
  head: (ctx) => pageHead({ path: "/osint", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx) }),
  component: SocDashboard,
});

type StatusFilter = "all" | TelemetryEvent["status"];
const PAGE_SIZE = 8;
const fmt = (value: number) => value.toLocaleString("en-US");

function SocDashboard() {
  const { isArabic, t } = useLanguage();
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TelemetryEvent | null>(null);

  const metrics = socMetrics(EVENTS);
  const bySeverity = openBySeverity(EVENTS);
  const tactics = tacticBreakdown(EVENTS);
  const assets = topAssets(EVENTS, 5);
  const coverage = groupCoverage(EVENTS);
  const fleet = [
    { key: "online", label: l("Online", "متصل"), value: FLEET.online, color: "var(--clean)" },
    { key: "outdated", label: l("Outdated agent", "وكيل قديم"), value: FLEET.outdated, color: "var(--caution)" },
    { key: "offline", label: l("Offline", "غير متصل"), value: FLEET.offline, color: "var(--malicious)" },
  ];
  const rows = useMemo(
    () =>
      EVENTS.filter((event) => (severity === "all" || event.severity === severity) && (status === "all" || event.status === status)).sort(
        (a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || b.timestamp.localeCompare(a.timestamp),
      ),
    [severity, status],
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pages);
  const sourceName = (id: string) => PROVIDERS.find((p) => p.id === id)?.name ?? id;
  const statusLabel = (value: TelemetryEvent["status"]) => (value === "Open" ? l("Open", "مفتوح") : value === "Resolved" ? l("Mitigated", "تمت المعالجة") : l("Observed", "مرصود"));
  const severityBadge = (value: Severity) => <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[value]}`}>{t(value)}</span>;
  const maxTactic = Math.max(1, ...tactics.map((row) => row.count));

  const kpis = [
    { label: l("Active threats", "التهديدات النشطة"), value: String(metrics.active), detail: l("Open in the investigation queue", "مفتوحة في قائمة التحقيق"), icon: ShieldAlert, color: "text-malicious" },
    { label: l("Critical", "حرجة"), value: String(metrics.critical), detail: l("Open · needs immediate action", "مفتوحة · تحتاج إجراءً فورياً"), icon: TriangleAlert, color: "text-malicious" },
    { label: l("Mitigated", "تمت معالجتها"), value: String(metrics.mitigated), detail: l("Resolved in this snapshot", "حُلّت في هذه اللقطة"), icon: CheckCircle2, color: "text-clean" },
    { label: l("Endpoints online", "الأجهزة المتصلة"), value: fmt(FLEET.online), detail: l(`of ${fmt(FLEET.total)} · ${fleetOnlinePercent()}%`, `من ${fmt(FLEET.total)} · ${fleetOnlinePercent()}%`), icon: Monitor, color: "text-primary" },
    { label: l("Mean time to detect", "متوسط زمن الكشف"), value: `${RESPONSE.mttd} ${l("min", "د")}`, detail: l("Sample figure", "رقم تجريبي"), icon: Timer, color: "text-xdr-cloud" },
    { label: l("Mean time to respond", "متوسط زمن الاستجابة"), value: `${RESPONSE.mttr} ${l("min", "د")}`, detail: l("Sample figure", "رقم تجريبي"), icon: Clock3, color: "text-caution" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" data-no-translate>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-xs text-primary">
            <Radar className="size-4" />
            {l("SECURITY OPERATIONS CENTER", "مركز العمليات الأمنية")}
            <span className="rounded border border-caution/30 bg-caution/10 px-2 py-0.5 text-caution">{l("In development", "قيد التطوير")}</span>
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{l("SOC Dashboard", "لوحة مركز العمليات الأمنية")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {l("Threats, endpoints and telemetry health in one view for the analyst on shift.", "التهديدات والأجهزة وصحة البيانات في عرض واحد للمحلل المناوب.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/xdr">
              <Plug />
              {l("Telemetry settings", "إعدادات البيانات")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/osint-hub">
              <Search />
              {l("OSINT Hub", "مركز OSINT")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-caution/25 bg-caution/5 px-4 py-3 text-xs">
        <p className="flex items-start gap-2 leading-relaxed">
          <Database className="mt-0.5 size-4 shrink-0 text-caution" />
          <span>
            <strong className="text-caution">{l("Demo workspace. ", "مساحة تجريبية. ")}</strong>
            {l("Every number, threat and chart is synthetic. No sources are connected and no live telemetry is ingested.", "كل الأرقام والتهديدات والرسوم اصطناعية. لا توجد مصادر متصلة ولا بيانات حقيقية.")}
          </span>
        </p>
        <span className="shrink-0 font-mono text-muted-foreground" dir="ltr">
          {SNAPSHOT_LABEL}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="surface min-w-0 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xs text-muted-foreground">{kpi.label}</h2>
              <kpi.icon className={`size-4 shrink-0 ${kpi.color}`} />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">{kpi.value}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{kpi.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <section className="surface min-w-0 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{l("Threat activity · 14 days", "نشاط التهديدات · 14 يوماً")}</h2>
            <span className="font-mono text-[11px] text-muted-foreground">{l("SAMPLE", "عينة")}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-malicious" />
              {l("Detected", "مكتشفة")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-clean" />
              {l("Mitigated", "تمت معالجتها")}
            </span>
          </div>
          <div className="xdr-chart mt-3 h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...THREAT_TREND_14D]} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-md border border-border bg-popover p-3 text-xs shadow-panel">
                        <p className="mb-2 font-mono">{label}</p>
                        {payload.map((entry) => (
                          <p key={String(entry.dataKey)} className="py-0.5">
                            {entry.dataKey === "detected" ? l("Detected", "مكتشفة") : l("Mitigated", "تمت معالجتها")}: {entry.value}
                          </p>
                        ))}
                      </div>
                    ) : null
                  }
                />
                <Area name="detected" type="monotone" dataKey="detected" stroke="var(--malicious)" fill="var(--malicious)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
                <Area name="mitigated" type="monotone" dataKey="mitigated" stroke="var(--clean)" fill="var(--clean)" fillOpacity={0.06} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface min-w-0 p-5">
          <h2 className="text-base font-semibold">{l("Open threats by severity", "التهديدات المفتوحة حسب الخطورة")}</h2>
          <div className="relative mx-auto mt-3 h-44 w-44" role="img" aria-label={bySeverity.map((row) => `${t(row.severity)}: ${row.count}`).join(", ")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySeverity} dataKey="count" nameKey="severity" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {bySeverity.map((row) => (
                    <Cell key={row.severity} fill={SEVERITY_COLOR[row.severity]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-3xl font-semibold">{metrics.active}</p>
                <p className="text-[11px] text-muted-foreground">{l("open", "مفتوحة")}</p>
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-xs">
            {bySeverity.map((row) => (
              <li key={row.severity} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <svg className="size-2.5" viewBox="0 0 10 10" aria-hidden="true">
                    <circle cx="5" cy="5" r="5" fill={SEVERITY_COLOR[row.severity]} />
                  </svg>
                  {t(row.severity)}
                </span>
                <span className="font-mono text-muted-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="surface min-w-0 p-5">
          <h2 className="text-base font-semibold">{l("Top MITRE ATT&CK tactics", "أبرز تكتيكات MITRE ATT&CK")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{l("Illustrative mapping of sample events", "ربط توضيحي لأحداث العينة")}</p>
          <ul className="mt-4 space-y-3">
            {tactics.map((row) => (
              <li key={row.tactic} className="grid grid-cols-[1fr_24px] items-center gap-x-3 gap-y-1 text-xs">
                <span className="truncate">{row.tactic}</span>
                <span className="text-end font-mono text-muted-foreground">{row.count}</span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <svg className="h-full w-full" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">
                    <rect width={(row.count / maxTactic) * 100} height="1" className="fill-primary" />
                  </svg>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface min-w-0 p-5">
          <h2 className="text-base font-semibold">{l("Endpoint fleet", "أسطول الأجهزة")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{l(`${fmt(FLEET.total)} managed endpoints · sample`, `${fmt(FLEET.total)} جهازاً مُداراً · عينة`)}</p>
          <div className="relative mx-auto mt-3 h-36 w-36" role="img" aria-label={fleet.map((row) => `${row.label}: ${fmt(row.value)}`).join(", ")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fleet} dataKey="value" nameKey="label" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {fleet.map((row) => (
                    <Cell key={row.key} fill={row.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="font-display text-2xl font-semibold">{fleetOnlinePercent()}%</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-xs">
            {fleet.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <svg className="size-2.5" viewBox="0 0 10 10" aria-hidden="true">
                    <circle cx="5" cy="5" r="5" fill={row.color} />
                  </svg>
                  {row.label}
                </span>
                <span className="font-mono text-muted-foreground">{fmt(row.value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface min-w-0 p-5">
          <h2 className="text-base font-semibold">{l("Most affected assets", "الأصول الأكثر تأثراً")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{l("By open threats", "حسب التهديدات المفتوحة")}</p>
          {assets.length ? (
            <ul className="mt-4 divide-y divide-border">
              {assets.map((row) => (
                <li key={row.asset} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <span className="min-w-0 truncate font-mono text-muted-foreground">{row.asset}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    {severityBadge(row.worst)}
                    <span className="w-4 text-end font-mono">{row.count}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{l("No open threats.", "لا توجد تهديدات مفتوحة.")}</p>
          )}
        </section>
      </div>

      <section className="surface mt-4 min-w-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {l("Threats", "التهديدات")} <span className="ms-2 text-xs font-normal text-muted-foreground">{l("Demo data", "بيانات تجريبية")}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label={l("Threat status", "حالة التهديد")}>
              {(["all", "Open", "Observed", "Resolved"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={status === value ? "secondary" : "outline"}
                  aria-pressed={status === value}
                  onClick={() => {
                    setStatus(value);
                    setPage(1);
                  }}
                >
                  {value === "all" ? l("All", "الكل") : statusLabel(value)}
                </Button>
              ))}
            </div>
            <Select
              value={severity}
              onValueChange={(value) => {
                setSeverity(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" aria-label={l("Filter severity", "تصفية الخطورة")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l("All severities", "كل درجات الخطورة")}</SelectItem>
                {SEVERITIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {rows.length ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[820px] text-start text-sm">
                <thead className="bg-panel text-[11px] text-muted-foreground">
                  <tr>
                    {[l("Time · UTC", "الوقت · UTC"), l("Severity", "الخطورة"), l("Threat", "التهديد"), l("Source", "المصدر"), l("Asset / user", "الأصل / المستخدم"), l("Status", "الحالة"), l("Details", "التفاصيل")].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-start font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE).map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-panel">
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-muted-foreground" dir="ltr">
                        {event.timestamp.slice(11, 16)}
                      </td>
                      <td className="px-4 py-4">{severityBadge(event.severity)}</td>
                      <td className="min-w-64 px-4 py-4 text-xs">
                        <Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-start text-xs text-foreground" onClick={() => setSelected(event)}>
                          {event.summary[isArabic ? 1 : 0]}
                        </Button>
                      </td>
                      <td className="px-4 py-4 text-xs">{sourceName(event.source)}</td>
                      <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{event.asset}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{statusLabel(event.status)}</td>
                      <td className="px-4 py-4">
                        <Button variant="ghost" size="icon" aria-label={l(`View threat ${event.id}`, `عرض التهديد ${event.id}`)} onClick={() => setSelected(event)}>
                          <ArrowRight />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {l(
                  `Showing ${(visiblePage - 1) * PAGE_SIZE + 1}–${Math.min(visiblePage * PAGE_SIZE, rows.length)} of ${rows.length} sample threats`,
                  `عرض ${(visiblePage - 1) * PAGE_SIZE + 1}–${Math.min(visiblePage * PAGE_SIZE, rows.length)} من ${rows.length} تهديداً تجريبياً`,
                )}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)}>
                  {l("Previous", "السابق")}
                </Button>
                <span className="font-mono text-xs">
                  {visiblePage} / {pages}
                </span>
                <Button variant="outline" size="sm" disabled={visiblePage === pages} onClick={() => setPage(visiblePage + 1)}>
                  {l("Next", "التالي")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 border-y border-border py-12 text-center">
            <Search className="mx-auto size-6 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">{l("No matching sample threats", "لا توجد تهديدات تجريبية مطابقة")}</h3>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSeverity("all");
                setStatus("all");
              }}
            >
              {l("Clear filters", "مسح التصفية")}
            </Button>
          </div>
        )}
      </section>

      <section className="mt-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{l("Telemetry coverage", "تغطية البيانات")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{l("Sources feeding this dashboard. None are connected yet.", "المصادر التي تغذي هذه اللوحة. لا يوجد مصدر متصل بعد.")}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/xdr">
              {l("Manage sources", "إدارة المصادر")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {coverage.map((row) => {
            const Icon = GROUP_STYLE[row.group].icon;
            return (
              <article key={row.group} className="surface min-w-0 p-4">
                <div className="flex items-center gap-2">
                  <Icon className={`size-4 shrink-0 ${GROUP_STYLE[row.group].text}`} />
                  <h3 className="truncate text-xs font-medium">{groupLabel(row.group, isArabic)}</h3>
                </div>
                <p className="mt-3 font-mono text-lg">{row.providers}</p>
                <p className="text-[11px] text-muted-foreground">{l(`${row.withSamples} with sample data · ${row.events} events`, `${row.withSamples} ببيانات تجريبية · ${row.events} حدثاً`)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side={isArabic ? "left" : "right"} dir={isArabic ? "rtl" : "ltr"} className="w-full overflow-y-auto sm:max-w-lg" data-no-translate>
          <SheetHeader className="text-start sm:text-start">
            <span className="mb-2 font-mono text-xs text-caution">{l("SYNTHETIC THREAT · DEMO DATA", "تهديد اصطناعي · بيانات تجريبية")}</span>
            <SheetTitle>{l("Threat details", "تفاصيل التهديد")}</SheetTitle>
            <SheetDescription>{selected?.id}</SheetDescription>
          </SheetHeader>
          {selected && (
            <>
              <div className="my-6">
                {severityBadge(selected.severity)}
                <h3 className="mt-4 text-xl font-semibold leading-relaxed">{selected.summary[isArabic ? 1 : 0]}</h3>
              </div>
              <dl className="divide-y divide-border text-sm">
                {[
                  [l("Timestamp", "الوقت"), `${selected.timestamp.replace("T", " ").replace("Z", "")} UTC`],
                  [l("Source", "المصدر"), sourceName(selected.source)],
                  [l("Asset / user", "الأصل / المستخدم"), selected.asset],
                  [l("Event type", "نوع الحدث"), selected.type],
                  [l("Status", "الحالة"), statusLabel(selected.status)],
                  [l("Data origin", "مصدر البيانات"), l("Synthetic fixture · no live ingestion", "عينة اصطناعية · دون استقبال حقيقي")],
                ].map(([label, value]) => (
                  <div className="grid grid-cols-[100px_1fr] gap-4 py-4" key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-words text-xs" dir="auto">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <section className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">MITRE ATT&CK</h3>
                {selected.technique ? (
                  <div className="mt-3 border-s-2 border-primary ps-4">
                    <p className="font-mono text-sm text-primary">{selected.technique.id}</p>
                    <p className="mt-1 text-sm">{selected.technique.name}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {l("Tactic", "التكتيك")}: {selected.technique.tactic}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">{l("Illustrative mapping; not validated threat attribution.", "ربط توضيحي؛ وليس إسناداً مؤكداً للتهديد.")}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">{l("Not applicable — this operational event has no ATT&CK mapping.", "لا ينطبق — هذا الحدث التشغيلي ليس له ربط ATT&CK.")}</p>
                )}
              </section>
              <Button asChild className="mt-6" variant="outline">
                <Link to="/xdr">
                  <Activity />
                  {l("View telemetry settings", "عرض إعدادات البيانات")}
                </Link>
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
