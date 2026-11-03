import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, Boxes, Check, Database, LockKeyhole, Plug, RefreshCw, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XdrProviderDialog, type SetupDraft } from "@/components/xdr-provider-dialog";
import { useLanguage } from "@/lib/language";
import { headLanguage, pageHead } from "@/lib/seo";
import { DEFAULT_COLLECTION_SETTINGS, GROUPS, PROVIDERS, SEVERITIES, collectionMethods, type CollectionSettings, type Group, type Provider } from "@/lib/xdr-demo";
import { GROUP_STYLE, groupLabel } from "@/lib/xdr-ui";

const TITLE = "XDR Telemetry Settings | SentinelGrid";
const DESCRIPTION =
  "Plan which firewalls, endpoint protection such as Kaspersky Security Center, Windows servers and cloud platforms feed your XDR telemetry. Safe, session-only setup drafts; nothing is connected.";

export const Route = createFileRoute("/xdr")({
  head: (ctx) => pageHead({ path: "/xdr", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx) }),
  component: XdrSettingsPage,
});

type StatusFilter = "all" | "demo" | "setup" | "draft";

function XdrSettingsPage() {
  const { isArabic, t } = useLanguage();
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const [tab, setTab] = useState("sources");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Group>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SetupDraft>>({});
  const [settings, setSettings] = useState<CollectionSettings>(DEFAULT_COLLECTION_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const needle = query.trim().toLowerCase();
  const visible = PROVIDERS.filter(
    (p) =>
      (category === "all" || p.group === category) &&
      (status === "all" || (status === "demo" ? p.demo : status === "setup" ? !p.demo : Boolean(drafts[p.id]))) &&
      (!needle || `${p.name} ${p.group} ${p.feeds.join(" ")} ${p.capability.join(" ")}`.toLowerCase().includes(needle)),
  );
  const draftCount = Object.keys(drafts).length;
  const filtersActive = Boolean(needle) || category !== "all" || status !== "all";
  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setStatus("all");
  };
  const updateSettings = <K extends keyof CollectionSettings>(key: K, value: CollectionSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSettingsSaved(false);
  };
  const methodLabel = (p: Provider) => {
    const chosen = collectionMethods(p).find((m) => m.id === drafts[p.id]?.method);
    return chosen ? chosen.label[isArabic ? 1 : 0] : l("Not selected", "غير محددة");
  };

  const summary = [
    { label: l("Sources in catalog", "المصادر في الدليل"), value: PROVIDERS.length, detail: l(`${GROUPS.length} categories`, `${GROUPS.length} فئات`), icon: Boxes, color: "text-primary" },
    { label: l("Setup drafts", "مسودات الإعداد"), value: draftCount, detail: l("This page session only", "لهذه الجلسة فقط"), icon: Settings2, color: "text-xdr-cloud" },
    { label: l("Connected sources", "المصادر المتصلة"), value: 0, detail: l("No live connections", "لا توجد اتصالات حقيقية"), icon: Plug, color: "text-caution" },
    { label: l("With sample data", "ببيانات تجريبية"), value: PROVIDERS.filter((p) => p.demo).length, detail: l("Shown on the SOC dashboard", "تظهر في لوحة مركز العمليات"), icon: Database, color: "text-clean" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" data-no-translate>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-xs text-primary">
            <Activity className="size-4" />
            {l("XDR TELEMETRY", "بيانات XDR")}
            <span className="rounded border border-caution/30 bg-caution/10 px-2 py-0.5 text-caution">{l("In development", "قيد التطوير")}</span>
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{l("XDR Telemetry Settings", "إعدادات بيانات XDR")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {l(
              "Choose which firewalls, endpoint protection, servers and cloud platforms feed the XDR pipeline, and prepare how each one will be collected.",
              "اختر الجدران النارية وحماية الأجهزة والخوادم ومنصات السحابة التي تغذي مسار XDR، وجهّز طريقة جمع بيانات كل منها.",
            )}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/osint">
            <Activity />
            {l("Open SOC dashboard", "فتح لوحة مركز العمليات")}
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex items-start gap-2 border-y border-caution/25 bg-caution/5 px-4 py-3 text-xs leading-relaxed">
        <Database className="mt-0.5 size-4 shrink-0 text-caution" />
        <p>
          <strong className="text-caution">{l("Prototype. ", "نموذج تجريبي. ")}</strong>
          {l(
            "Nothing here connects to a provider, stores credentials or ingests live data. Setup drafts live only in this page session.",
            "لا يتصل أي شيء هنا بمزوّد ولا يخزّن بيانات اعتماد ولا يستقبل بيانات حقيقية. مسودات الإعداد تبقى في هذه الجلسة فقط.",
          )}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((item) => (
          <article key={item.label} className="surface min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xs text-muted-foreground sm:text-sm">{item.label}</h2>
              <item.icon className={`size-4 shrink-0 ${item.color}`} />
            </div>
            <p className="mt-4 font-display text-3xl font-semibold">{item.value}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{item.detail}</p>
          </article>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} dir={isArabic ? "rtl" : "ltr"} className="mt-8">
        <TabsList className="h-10">
          <TabsTrigger value="sources" className="gap-2">
            <Plug className="size-4" />
            {l("Data sources", "مصادر البيانات")}
          </TabsTrigger>
          <TabsTrigger value="collection" className="gap-2">
            <SlidersHorizontal className="size-4" />
            {l("Collection settings", "إعدادات الجمع")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label={l("Source category", "فئة المصدر")}>
            <Button variant={category === "all" ? "secondary" : "outline"} size="sm" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
              {l("All", "الكل")}
              <span className="font-mono text-xs text-muted-foreground">{PROVIDERS.length}</span>
            </Button>
            {GROUPS.map((group) => {
              const Icon = GROUP_STYLE[group].icon;
              return (
                <Button key={group} variant={category === group ? "secondary" : "outline"} size="sm" aria-pressed={category === group} onClick={() => setCategory(group)}>
                  <Icon className={GROUP_STYLE[group].text} />
                  {groupLabel(group, isArabic)}
                  <span className="font-mono text-xs text-muted-foreground">{PROVIDERS.filter((p) => p.group === group).length}</span>
                </Button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="ps-9"
                aria-label={l("Search sources", "بحث المصادر")}
                placeholder={l("Search Kaspersky, Fortinet, Windows, AWS…", "ابحث عن Kaspersky أو Fortinet أو Windows أو AWS…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger aria-label={l("Source status", "حالة المصدر")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l("All statuses", "كل الحالات")}</SelectItem>
                <SelectItem value="draft">{l("Draft prepared", "مسودة جاهزة")}</SelectItem>
                <SelectItem value="demo">{l("Sample data", "بيانات تجريبية")}</SelectItem>
                <SelectItem value="setup">{l("Needs setup", "يحتاج إلى إعداد")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} disabled={!filtersActive}>
              <SlidersHorizontal />
              {l("Reset", "إعادة ضبط")}
            </Button>
          </div>

          {GROUPS.map((group) => {
            const list = visible.filter((p) => p.group === group);
            if (!list.length) return null;
            const Icon = GROUP_STYLE[group].icon;
            return (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h2 id={`group-${group}`} className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Icon className={`size-4 ${GROUP_STYLE[group].text}`} />
                  {groupLabel(group, isArabic)}
                  <span className="ms-1 font-mono text-xs font-normal text-muted-foreground">{list.length}</span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((p) => (
                    <article key={p.id} className="surface flex min-w-0 flex-col p-5">
                      <div className="flex items-start gap-3">
                        <div className={`grid size-9 shrink-0 place-items-center rounded-md border border-border bg-muted ${GROUP_STYLE[group].text}`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold">{p.name}</h3>
                          <p className={`mt-1 text-[11px] ${p.demo ? "text-caution" : "text-muted-foreground"}`}>
                            {p.demo ? l("Sample data · not connected", "بيانات تجريبية · غير متصل") : l("Needs setup · not connected", "يحتاج إلى إعداد · غير متصل")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{p.capability[isArabic ? 1 : 0]}</p>
                      <dl className="mt-4 space-y-1 text-xs">
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{l("Collection method", "طريقة الجمع")}</dt>
                          <dd className="text-end">{methodLabel(p)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{l("Last live sync", "آخر مزامنة حقيقية")}</dt>
                          <dd>{l("Never", "لم تحدث")}</dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <span className={`flex items-center gap-1 text-[11px] ${drafts[p.id] ? "text-primary" : "text-muted-foreground"}`}>
                          {drafts[p.id] && <Check className="size-3" />}
                          {drafts[p.id] ? l("Draft prepared · session only", "مسودة جاهزة · لهذه الجلسة") : l("Adapter pending", "المحوّل قيد الانتظار")}
                        </span>
                        <Button variant="outline" size="sm" aria-label={l(`Configure ${p.name}`, `إعداد ${p.name}`)} onClick={() => setProvider(p)}>
                          <Settings2 />
                          {l("Configure", "إعداد")}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {!visible.length && (
            <div className="border-y border-border py-12 text-center">
              <Boxes className="mx-auto size-6 text-muted-foreground" />
              <h2 className="mt-3 font-semibold">{l("No sources match", "لا توجد مصادر مطابقة")}</h2>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                {l("Clear filters", "مسح التصفية")}
              </Button>
            </div>
          )}

          <div className="flex items-start gap-3 border-t border-border pt-6">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">{l("Secure by design, not connected by default", "آمن في التصميم وغير متصل افتراضياً")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {l(
                  "Credentials belong in secure server-side secrets. Each real integration needs provider-specific authorization, a backend ingestion adapter, normalization and access controls. This catalog contains setup checklists and synthetic samples only.",
                  "مكان الاعتمادات هو أسرار الخادم الآمنة. يحتاج كل تكامل حقيقي إلى تفويض خاص بالمزوّد ومحوّل استقبال خلفي وتوحيد البيانات وضوابط الوصول. هذا الدليل يحتوي فقط على قوائم متطلبات وعينات اصطناعية.",
                )}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collection" className="mt-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">{l("Collection settings", "إعدادات الجمع")}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {l("Defaults applied to every source once ingestion exists. Individual sources can override the interval in their own setup.", "إعدادات افتراضية تُطبّق على كل مصدر عند توفر الاستقبال. يمكن لكل مصدر تعديل الفترة في إعداده الخاص.")}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <SettingSelect
              id="xdr-schema"
              label={l("Event schema", "مخطط الأحداث")}
              hint={l("How events from every source are normalized.", "كيف تُوحَّد أحداث كل المصادر.")}
              value={settings.schema}
              onChange={(value) => updateSettings("schema", value as CollectionSettings["schema"])}
              options={[
                ["ocsf", l("OCSF (Open Cybersecurity Schema)", "OCSF (المخطط المفتوح للأمن السيبراني)")],
                ["ecs", l("Elastic Common Schema (ECS)", "مخطط Elastic الموحّد (ECS)")],
                ["cef", l("CEF (Common Event Format)", "CEF (صيغة الأحداث الموحّدة)")],
              ]}
            />
            <SettingSelect
              id="xdr-interval"
              label={l("Default sync interval", "فترة المزامنة الافتراضية")}
              hint={l("How often API-based sources are polled.", "عدد مرات سحب المصادر المعتمدة على API.")}
              value={settings.interval}
              onChange={(value) => updateSettings("interval", value)}
              options={["1", "5", "15", "30"].map((v) => [v, `${v} ${l("minutes", "دقائق")}`] as [string, string])}
            />
            <SettingSelect
              id="xdr-retention"
              label={l("Retention", "مدة الاحتفاظ")}
              hint={l("How long normalized events are kept.", "مدة الاحتفاظ بالأحداث الموحّدة.")}
              value={settings.retention}
              onChange={(value) => updateSettings("retention", value)}
              options={["30", "90", "180", "365"].map((v) => [v, `${v} ${l("days", "يوماً")}`] as [string, string])}
            />
            <SettingSelect
              id="xdr-severity"
              label={l("Minimum severity for the SOC dashboard", "أدنى خطورة تظهر في لوحة مركز العمليات")}
              hint={l("Lower-severity events are stored but not surfaced.", "تُخزَّن الأحداث الأقل خطورة دون إظهارها.")}
              value={settings.minSeverity}
              onChange={(value) => updateSettings("minSeverity", value as CollectionSettings["minSeverity"])}
              options={SEVERITIES.map((v) => [v, t(v)] as [string, string])}
            />
            <SettingSelect
              id="xdr-heartbeat"
              label={l("Silent-source alert", "تنبيه المصدر الصامت")}
              hint={l("Raise a health alert when a source sends nothing.", "إطلاق تنبيه صحة عندما لا يرسل المصدر شيئاً.")}
              value={settings.heartbeat}
              onChange={(value) => updateSettings("heartbeat", value)}
              options={["5", "15", "30", "60"].map((v) => [v, l(`After ${v} minutes`, `بعد ${v} دقائق`)] as [string, string])}
            />
            <div className="surface flex items-start justify-between gap-4 p-4">
              <div>
                <label htmlFor="xdr-redact" className="text-sm font-medium">
                  {l("Redact personal data", "إخفاء البيانات الشخصية")}
                </label>
                <p className="mt-1 text-xs text-muted-foreground">{l("Mask user names and email addresses in stored events.", "إخفاء أسماء المستخدمين والبريد الإلكتروني في الأحداث المخزّنة.")}</p>
              </div>
              <Switch id="xdr-redact" checked={settings.redact} onCheckedChange={(value) => updateSettings("redact", value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setSettingsSaved(true)}>
              <Check />
              {l("Save draft", "حفظ المسودة")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSettings(DEFAULT_COLLECTION_SETTINGS);
                setSettingsSaved(false);
              }}
            >
              <RefreshCw />
              {l("Reset to defaults", "استعادة الافتراضي")}
            </Button>
            <p className="text-xs text-muted-foreground" role="status">
              {settingsSaved
                ? l("Draft saved for this page session only. Nothing was applied to any source.", "حُفظت المسودة لهذه الجلسة فقط. لم يُطبَّق شيء على أي مصدر.")
                : l("Unsaved changes stay in this page only.", "التغييرات غير المحفوظة تبقى في هذه الصفحة فقط.")}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {provider && (
        <XdrProviderDialog
          key={provider.id}
          provider={provider}
          draft={drafts[provider.id]}
          onClose={() => setProvider(null)}
          onSave={(draft) => setDrafts((previous) => ({ ...previous, [provider.id]: draft }))}
        />
      )}
    </div>
  );
}

function SettingSelect({ id, label, hint, value, onChange, options }: { id: string; label: string; hint: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <div className="surface p-4">
      <label id={`${id}-label`} className="text-sm font-medium">
        {label}
      </label>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-3" aria-labelledby={`${id}-label`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
