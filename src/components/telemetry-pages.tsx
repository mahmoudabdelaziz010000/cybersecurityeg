import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Database, Plug, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GROUP_BLURB, SOPHOS_PROVIDER_ID, providersOf, telemetrySplat } from "@/lib/console-nav";
import { useLanguage } from "@/lib/language";
import { SNAPSHOT_LABEL } from "@/lib/soc-demo";
import { EVENTS, PROVIDERS, collectionMethods, type Group, type Provider, type TelemetryEvent } from "@/lib/xdr-demo";
import { GROUP_STYLE, SEVERITY_STYLE, groupLabel } from "@/lib/xdr-ui";

/** Link to a provider's page; Sophos goes to its live dashboard instead of a sample-data page. */
function ProviderLink({ provider, className, children }: { provider: Provider; className: string; children: ReactNode }) {
  if (provider.id === SOPHOS_PROVIDER_ID) {
    return <Link to="/xdr/firewalls" search={(prev) => ({ ...prev, section: "overview" as const })} className={className}>{children}</Link>;
  }
  return <Link to="/telemetry/$" params={{ _splat: telemetrySplat(provider.group, provider) }} className={className}>{children}</Link>;
}

function useCopy() {
  const { isArabic, t } = useLanguage();
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const idx = isArabic ? 1 : 0;
  const status = (provider: Provider) =>
    provider.id === SOPHOS_PROVIDER_ID
      ? { label: l("Live API · read-only", "واجهة مباشرة · قراءة فقط"), tone: "text-clean" }
      : provider.demo
        ? { label: l("Sample data", "بيانات تجريبية"), tone: "text-caution" }
        : { label: l("Needs setup", "يحتاج إلى إعداد"), tone: "text-muted-foreground" };
  return { isArabic, t, l, idx, status };
}

function DemoNotice({ live }: { live?: boolean }) {
  const { l } = useCopy();
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-caution/25 bg-caution/5 px-4 py-3 text-xs">
      <p className="flex items-start gap-2 leading-relaxed">
        <Database className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
        <span>
          <strong className="text-caution">{l("Demo workspace. ", "مساحة تجريبية. ")}</strong>
          {live
            ? l("Sample events are synthetic; only the Sophos Firewall dashboard reads live data, and only after you add server secrets.", "الأحداث التجريبية اصطناعية؛ لوحة Sophos Firewall وحدها تقرأ بيانات مباشرة، وبعد إضافة أسرار الخادم فقط.")
            : l("Every event here is synthetic. No source is connected and no live telemetry is ingested.", "كل حدث هنا اصطناعي. لا يوجد مصدر متصل ولا بيانات حقيقية.")}
        </span>
      </p>
      <span className="shrink-0 font-mono text-muted-foreground" dir="ltr">{SNAPSHOT_LABEL}</span>
    </div>
  );
}

function EventsTable({ events }: { events: TelemetryEvent[] }) {
  const { l, t, idx } = useCopy();
  const sourceName = (id: string) => PROVIDERS.find((provider) => provider.id === id)?.name ?? id;
  const statusLabel = (value: TelemetryEvent["status"]) => (value === "Open" ? l("Open", "مفتوح") : value === "Resolved" ? l("Mitigated", "تمت المعالجة") : l("Observed", "مرصود"));
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] text-start text-sm">
        <caption className="sr-only">{l("Sample telemetry events", "أحداث بيانات تجريبية")}</caption>
        <thead className="bg-panel text-[11px] text-muted-foreground">
          <tr>
            {[l("Severity", "الخطورة"), l("Asset", "الأصل"), l("Event", "الحدث"), l("Source", "المصدر"), l("Time (UTC)", "الوقت (UTC)"), l("Status", "الحالة")].map((heading) => (
              <th key={heading} scope="col" className="px-4 py-3 text-start font-medium">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="px-4 py-2.5"><span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[event.severity]}`}>{t(event.severity)}</span></td>
              <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">{event.asset}</td>
              <td className="px-4 py-2.5">{event.summary[idx]}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{sourceName(event.source)}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground" dir="ltr">{event.timestamp.slice(0, 16).replace("T", " ")}</td>
              <td className="px-4 py-2.5 text-xs">{statusLabel(event.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const byNewest = (a: TelemetryEvent, b: TelemetryEvent) => b.timestamp.localeCompare(a.timestamp);

/** Dashboard for one telemetry group, e.g. /telemetry/firewalls. */
export function TelemetryGroupPage({ group }: { group: Group }) {
  const { l, idx, isArabic, status } = useCopy();
  const style = GROUP_STYLE[group];
  const Icon = style.icon;
  const providers = providersOf(group);
  const ids = new Set(providers.map((provider) => provider.id));
  const events = EVENTS.filter((event) => ids.has(event.source)).sort(byNewest);
  const open = events.filter((event) => event.status === "Open");
  const kpis = [
    { label: l("Sources", "المصادر"), value: providers.length, tone: "" },
    { label: l("With sample data", "ببيانات تجريبية"), value: providers.filter((provider) => provider.demo).length, tone: "" },
    { label: l("Sample events", "أحداث تجريبية"), value: events.length, tone: "" },
    { label: l("Open threats", "تهديدات مفتوحة"), value: open.length, tone: open.length ? "text-caution" : "" },
    { label: l("Critical open", "حرجة مفتوحة"), value: open.filter((event) => event.severity === "Critical").length, tone: "text-malicious" },
  ];
  const name = groupLabel(group, isArabic);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" data-no-translate>
      <nav aria-label={l("Breadcrumb", "مسار التنقل")} className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">{l("Dashboard", "لوحة التحكم")}</Link>
        <span aria-hidden="true">/</span>
        <span>{l("Telemetry", "مصادر البيانات")}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-foreground">{name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className={`mb-3 flex items-center gap-2 font-mono text-xs ${style.text}`}><Icon className="size-4" aria-hidden="true" />{l("TELEMETRY DASHBOARD", "لوحة بيانات")}</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{l(`${name} telemetry`, `بيانات ${name}`)}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{GROUP_BLURB[group][idx]}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/xdr"><Plug />{l("Telemetry settings", "إعدادات البيانات")}</Link>
        </Button>
      </div>

      <DemoNotice live={group === "Firewalls"} />

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="surface min-w-0 p-4">
            <dt className="text-xs text-muted-foreground">{kpi.label}</dt>
            <dd className={`mt-2 font-display text-3xl font-semibold ${kpi.tone}`}>{kpi.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-base font-semibold">{l("Sources", "المصادر")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => {
            const state = status(provider);
            const count = events.filter((event) => event.source === provider.id).length;
            return (
              <li key={provider.id}>
                <ProviderLink provider={provider} className="surface group flex h-full flex-col p-5 transition-colors hover:bg-accent/40">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold">{provider.name}</span>
                    <span className={`shrink-0 text-[11px] ${state.tone}`}>{state.label}</span>
                  </span>
                  <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{provider.capability[idx]}</span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {provider.feeds.map((feed) => <span key={feed} className="rounded bg-muted px-2 py-0.5 font-mono text-[11px]">{feed}</span>)}
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-4 text-xs">
                    <span className="text-muted-foreground">{provider.id === SOPHOS_PROVIDER_ID ? l("Live dashboard", "لوحة مباشرة") : l(`${count} sample events`, `${count} حدثاً تجريبياً`)}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-primary">{l("Open", "فتح")}<ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" /></span>
                  </span>
                </ProviderLink>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="events-heading">
        <h2 id="events-heading" className="mb-4 flex items-center gap-2 text-base font-semibold"><ShieldAlert className="size-4 text-caution" aria-hidden="true" />{l("Recent events", "أحدث الأحداث")}</h2>
        {events.length > 0 ? (
          <EventsTable events={events.slice(0, 10)} />
        ) : (
          <p className="border-y border-border py-6 text-sm text-muted-foreground">{l(`No sample events for ${name} yet. Plan a connection in Telemetry settings.`, `لا توجد أحداث تجريبية لـ ${name} بعد. خطّط للاتصال من إعدادات البيانات.`)}</p>
        )}
      </section>
    </div>
  );
}

/** Page for one telemetry source, e.g. /telemetry/firewalls/paloalto. */
export function TelemetrySourcePage({ group, provider }: { group: Group; provider: Provider }) {
  const { l, idx, isArabic, status } = useCopy();
  const style = GROUP_STYLE[group];
  const Icon = style.icon;
  const state = status(provider);
  const events = EVENTS.filter((event) => event.source === provider.id).sort(byNewest);
  const siblings = providersOf(group).filter((item) => item.id !== provider.id);
  const methods = collectionMethods(provider);
  const name = groupLabel(group, isArabic);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" data-no-translate>
      <nav aria-label={l("Breadcrumb", "مسار التنقل")} className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">{l("Dashboard", "لوحة التحكم")}</Link>
        <span aria-hidden="true">/</span>
        <Link to="/telemetry/$" params={{ _splat: telemetrySplat(group) }} className="hover:text-foreground">{name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-foreground">{provider.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className={`mb-3 flex items-center gap-2 font-mono text-xs ${style.text}`}>
            <Icon className="size-4" aria-hidden="true" />{name.toUpperCase()}
            <span className={`rounded border border-border px-2 py-0.5 ${state.tone}`}>{state.label}</span>
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{l(`${provider.name} telemetry`, `بيانات ${provider.name}`)}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{provider.capability[idx]}</p>
        </div>
        <Button asChild>
          <Link to="/xdr"><Plug />{l("Plan this connection", "خطّط لهذا الاتصال")}</Link>
        </Button>
      </div>

      <DemoNotice />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="collects-heading">
          <h2 id="collects-heading" className="text-base font-semibold">{l("What it collects", "ما الذي يجمعه")}</h2>
          <p className="mt-3 flex flex-wrap gap-1.5">{provider.feeds.map((feed) => <span key={feed} className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{feed}</span>)}</p>
        </section>
        <section aria-labelledby="access-heading">
          <h2 id="access-heading" className="text-base font-semibold">{l("Access it needs", "الصلاحيات المطلوبة")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{provider.auth[idx]}</p>
        </section>
        <section aria-labelledby="methods-heading">
          <h2 id="methods-heading" className="text-base font-semibold">{l("How data arrives", "كيف تصل البيانات")}</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">{methods.map((method) => <li key={method.id}>{method.label[idx]}</li>)}</ul>
        </section>
      </div>

      <section className="mt-8" aria-labelledby="prepare-heading">
        <h2 id="prepare-heading" className="text-base font-semibold">{l("Details to prepare", "التفاصيل المطلوب تجهيزها")}</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {provider.fields.map((field) => <li key={field[0]} className="border-s-2 border-border ps-3">{field[idx]}</li>)}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="events-heading">
        <h2 id="events-heading" className="mb-4 flex items-center gap-2 text-base font-semibold"><ShieldAlert className="size-4 text-caution" aria-hidden="true" />{l("Sample events", "أحداث تجريبية")}</h2>
        {events.length > 0 ? (
          <EventsTable events={events} />
        ) : (
          <p className="border-y border-border py-6 text-sm text-muted-foreground">{l("No sample events for this source. Plan the connection in Telemetry settings to prepare it.", "لا توجد أحداث تجريبية لهذا المصدر. خطّط للاتصال من إعدادات البيانات لتجهيزه.")}</p>
        )}
      </section>

      {siblings.length > 0 && (
        <section className="mt-8" aria-labelledby="more-heading">
          <h2 id="more-heading" className="text-base font-semibold">{l(`More ${name} sources`, `مصادر أخرى ضمن ${name}`)}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {siblings.map((item) => (
              <li key={item.id}>
                <ProviderLink provider={item} className="inline-flex rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">{item.name}</ProviderLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
