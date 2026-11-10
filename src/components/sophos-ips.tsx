import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IpsDashboard, type IpsTab } from "@/components/ips-dashboard";
import { sophosLabel, type IpsData, type IpsSignature } from "@/lib/sophos-catalog";
import type { Severity } from "@/lib/xdr-demo";

const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];
const RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
const SEV_STYLE: Record<string, string> = {
  Critical: "text-malicious bg-malicious/10 border-malicious/25", High: "text-caution bg-caution/10 border-caution/25",
  Medium: "text-xdr-cloud bg-xdr-cloud/10 border-xdr-cloud/25", Low: "text-primary bg-primary/10 border-primary/25", Info: "text-muted-foreground bg-muted border-border",
};
const PAGE = 10;
type SortKey = "id" | "name" | "category" | "severity" | "platform" | "action";
type Tab = IpsTab;

const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`;
const selectClass = "h-9 rounded-md border border-border bg-background px-2.5 text-sm";

export function IpsView({ ips, isArabic }: { ips: IpsData; isArabic: boolean }) {
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [category, setCategory] = useState("all");
  const [action, setAction] = useState("all");
  const [policy, setPolicy] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "severity", desc: false });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uncoveredOnly, setUncoveredOnly] = useState(false);

  const categories = useMemo(() => [...new Set(ips.signatures.map((s) => s.category))].sort(), [ips.signatures]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = ips.signatures.filter((s) =>
      (severity === "all" || s.severity === severity) && (category === "all" || s.category === category) && (action === "all" || s.action === action) && (policy === "all" || s.policy === policy) &&
      (!q || `${s.id} ${s.name} ${s.cve ?? ""} ${s.category} ${s.policy}`.toLowerCase().includes(q)));
    const dir = sort.desc ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const diff = sort.key === "severity" ? (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9) : a[sort.key].localeCompare(b[sort.key], undefined, { numeric: true });
      return (diff || a.id.localeCompare(b.id, undefined, { numeric: true })) * dir;
    });
  }, [ips.signatures, query, severity, category, action, policy, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE, current * PAGE + PAGE);
  const detail: IpsSignature | undefined = ips.signatures.find((s) => s.id === selected);
  const reset = () => setPage(0);
  const filtersOn = query || severity !== "all" || category !== "all" || action !== "all" || policy !== "all";

  const head = (key: SortKey, label: string) => (
    <th scope="col" className="px-3 py-3 text-start font-medium" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => { setSort((s) => ({ key, desc: s.key === key ? !s.desc : false })); reset(); }}>
        {label}{sort.key === key && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </th>
  );
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };
  const actionLabel = (a: string) => (a === "Drop" ? l("Drop", "حظر") : a === "Recommended" ? l("Recommended", "موصى به") : l("Detect", "كشف"));

  const tabs: [Tab, string][] = [["dashboard", l("Dashboard", "لوحة المعلومات")], ["signatures", l("Signatures", "التواقيع")], ["policies", l("IPS policies", "سياسات IPS")], ["coverage", l("Rule coverage", "تغطية القواعد")]];

  return (
    <section className="space-y-4" aria-label={l("Intrusion prevention", "منع التسلل")}>
      <div role="tablist" aria-label={l("IPS views", "عروض IPS")} className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`rounded-md border px-3.5 py-1.5 text-sm transition-colors ${tab === id ? "border-primary bg-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      {tab === "dashboard" && <IpsDashboard ips={ips} isArabic={isArabic} onOpen={setTab} />}

      {tab === "signatures" && (
        <>
          {ips.kind === "rules" && (
            <p className="border-s-2 border-primary bg-primary/5 p-3 text-xs text-muted-foreground">{l(
              "The Sophos API returns each policy's signature rule groups (category, severity, platform, action), not single signature IDs. Each row below is one rule group.",
              "تعيد واجهة Sophos مجموعات قواعد التواقيع لكل سياسة (الفئة والخطورة والمنصة والإجراء) وليس معرّفات التواقيع الفردية. كل صف هنا هو مجموعة قواعد.")}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
              <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} placeholder={l("Search ID, name, CVE…", "ابحث بالمعرّف أو الاسم أو CVE…")} aria-label={l("Search signatures", "بحث في التواقيع")}
                className="h-9 w-64 rounded-md border border-border bg-background ps-8 pe-3 text-sm" dir="ltr" />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={l("Severity", "الخطورة")}>
              <button type="button" aria-pressed={severity === "all"} className={chip(severity === "all")} onClick={() => { setSeverity("all"); reset(); }}>{l("All", "الكل")}</button>
              {SEVERITIES.map((level) => <button key={level} type="button" aria-pressed={severity === level} className={chip(severity === level)} onClick={() => { setSeverity(level); reset(); }}>{sophosLabel(`ui.severity.${level}`, isArabic)}</button>)}
            </div>
            <select className={selectClass} value={category} aria-label={l("Category", "الفئة")} onChange={(e) => { setCategory(e.target.value); reset(); }}>
              <option value="all">{l("Category: all", "الفئة: الكل")}</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={selectClass} value={action} aria-label={l("Action", "الإجراء")} onChange={(e) => { setAction(e.target.value); reset(); }}>
              <option value="all">{l("Action: all", "الإجراء: الكل")}</option>{["Drop", "Recommended", "Detect"].map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </select>
            {policy !== "all" && <button type="button" className={`${chip(true)} inline-flex items-center gap-1`} onClick={() => { setPolicy("all"); reset(); }}>{policy}<X className="size-3" /></button>}
            {filtersOn && <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setSeverity("all"); setCategory("all"); setAction("all"); setPolicy("all"); reset(); }}>{l("Clear filters", "مسح التصفية")}</Button>}
          </div>

          <div className={`grid gap-4 ${detail ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
            <div className="min-w-0">
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[640px] text-start text-sm">
                  <thead className="bg-panel text-[11px] text-muted-foreground"><tr>
                    {head("id", "ID")}{head("name", l("Name", "الاسم"))}{head("category", l("Category", "الفئة"))}{head("severity", l("Severity", "الخطورة"))}{head("platform", l("Platform", "المنصة"))}{head("action", l("Action", "الإجراء"))}
                    <th scope="col" className="px-3 py-3 text-start font-medium">{l("On", "مفعّل")}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {visible.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{l("No signatures match these filters.", "لا توجد تواقيع مطابقة.")}</td></tr>}
                    {visible.map((s) => (
                      <tr key={s.id} tabIndex={0} aria-selected={selected === s.id} onClick={() => setSelected(s.id === selected ? null : s.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(s.id === selected ? null : s.id); } }}
                        className={`cursor-pointer align-top hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none ${selected === s.id ? "bg-accent" : ""}`}>
                        <td className="px-3 py-2.5 font-mono text-xs" dir="ltr">{s.id}</td>
                        <td className="px-3 py-2.5" dir="auto">{s.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground" dir="auto">{s.category}</td>
                        <td className="px-3 py-2.5"><span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${SEV_STYLE[s.severity]}`}>{sophosLabel(`ui.severity.${s.severity}`, isArabic)}</span></td>
                        <td className="px-3 py-2.5 text-muted-foreground" dir="auto">{s.platform}</td>
                        <td className={`px-3 py-2.5 ${s.action === "Detect" ? "text-caution" : "text-clean"}`}>{actionLabel(s.action)}</td>
                        <td className="px-3 py-2.5"><span className={`inline-block size-2 rounded-full ${s.enabled ? "bg-clean" : "bg-muted-foreground"}`} title={s.enabled ? l("Enabled", "مفعّل") : l("Disabled", "معطّل")} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span dir="ltr">{rows.length === 0 ? 0 : current * PAGE + 1}–{Math.min(rows.length, current * PAGE + PAGE)} / {rows.length}</span>
                <span className="flex items-center gap-1">
                  <Button variant="outline" size="icon" aria-label={l("Previous page", "الصفحة السابقة")} disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft className="rtl:rotate-180" /></Button>
                  <span className="px-2" dir="ltr">{current + 1} / {pages}</span>
                  <Button variant="outline" size="icon" aria-label={l("Next page", "الصفحة التالية")} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><ChevronRight className="rtl:rotate-180" /></Button>
                </span>
              </div>
            </div>

            {detail && (
              <aside className="surface space-y-3 self-start p-4 text-sm" aria-label={l("Signature detail", "تفاصيل التوقيع")}>
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-mono text-xs text-primary" dir="ltr">{detail.id}</div><h4 className="mt-1 font-semibold leading-snug" dir="auto">{detail.name}</h4></div>
                  <Button variant="ghost" size="icon" aria-label={l("Close", "إغلاق")} onClick={() => setSelected(null)}><X /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${SEV_STYLE[detail.severity]}`}>{sophosLabel(`ui.severity.${detail.severity}`, isArabic)}</span>
                  {detail.cve && <span className="rounded border border-border px-2 py-0.5 font-mono text-[11px]" dir="ltr">{detail.cve}</span>}
                </div>
                {detail.description && <p className="text-muted-foreground" dir="auto">{detail.description}</p>}
                <dl className="divide-y divide-border text-xs">
                  {([[l("Category", "الفئة"), detail.category], [l("Platform", "المنصة"), detail.platform], [l("Target", "الهدف"), detail.target], [l("Protocol", "البروتوكول"), detail.protocol], [l("Action", "الإجراء"), actionLabel(detail.action)], [l("Policy", "السياسة"), detail.policy], [l("Updated", "آخر تحديث"), detail.updated]] as const)
                    .filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-end" dir="auto">{v}</dd></div>)}
                </dl>
                {detail.hits && (
                  <div>
                    <h5 className="mb-1 text-xs font-medium">{l("Hits, last 24 hours (sample)", "الإصابات خلال 24 ساعة (تجريبية)")}</h5>
                    <div className="flex h-16 items-end gap-1" role="img" aria-label={l(`Hits per 2 hours: ${detail.hits.join(", ")}`, `الإصابات كل ساعتين: ${detail.hits.join("، ")}`)}>
                      {detail.hits.map((h, i) => <i key={i} title={String(h)} className="flex-1 rounded-t-sm bg-primary/70" style={{ height: `${Math.max(4, (h / Math.max(...detail.hits!, 1)) * 100)}%` }} />)}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void copy(detail.id)}>{copied ? <Check /> : <Copy />}{copied ? l("Copied", "تم النسخ") : l("Copy ID", "نسخ المعرّف")}</Button>
                  <Button variant="outline" size="sm" onClick={() => { setPolicy(detail.policy); reset(); }}>{l("Same policy", "نفس السياسة")}</Button>
                </div>
              </aside>
            )}
          </div>
        </>
      )}

      {tab === "policies" && (
        <ul className="grid gap-3 md:grid-cols-2">
          {ips.policies.length === 0 && <li className="text-sm text-muted-foreground">{l("No IPS policies.", "لا توجد سياسات IPS.")}</li>}
          {ips.policies.map((p) => {
            const share = p.rules ? Math.round((p.blocking / p.rules) * 100) : 0;
            return (
              <li key={p.name} className="surface space-y-3 p-4">
                <div><h4 className="font-semibold" dir="auto">{p.name}</h4>{p.description && <p className="mt-1 text-xs text-muted-foreground" dir="auto">{p.description}</p>}</div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={l(`${share}% blocking`, `${share}% حظر`)}><div className={`h-full ${share === 0 ? "bg-caution" : "bg-clean"}`} style={{ width: `${share}%` }} /></div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span dir="ltr">{p.rules} {l("rule groups", "مجموعات")} · <span className="text-clean">{p.blocking} {l("blocking", "حظر")}</span> · <span className="text-caution">{p.detectOnly} {l("detect", "كشف")}</span></span>
                  <Button variant="outline" size="sm" onClick={() => { setPolicy(p.name); reset(); setTab("signatures"); }}>{l("View signatures", "عرض التواقيع")}</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "coverage" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={uncoveredOnly} onChange={(e) => setUncoveredOnly(e.target.checked)} />{l("Show unprotected rules only", "عرض القواعد غير المحمية فقط")}</label>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[520px] text-start text-sm">
              <thead className="bg-panel text-[11px] text-muted-foreground"><tr>{[l("Rule", "القاعدة"), l("From", "من"), l("To", "إلى"), l("IPS policy", "سياسة IPS"), l("Status", "الحالة")].map((c) => <th key={c} scope="col" className="px-4 py-3 text-start font-medium">{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {ips.coverage.filter((c) => !uncoveredOnly || !c.covered).map((c, i) => (
                  <tr key={`${c.rule}-${i}`}>
                    <td className="px-4 py-2.5" dir="auto">{c.rule}</td><td className="px-4 py-2.5 text-muted-foreground" dir="auto">{c.from}</td><td className="px-4 py-2.5 text-muted-foreground" dir="auto">{c.to}</td>
                    <td className="px-4 py-2.5" dir="auto">{c.covered ? c.policy : "—"}</td>
                    <td className={`px-4 py-2.5 ${c.covered ? "text-clean" : "text-caution"}`}>{c.covered ? l("Protected", "محمية") : l("No IPS", "بدون IPS")}</td>
                  </tr>
                ))}
                {ips.coverage.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{l("No accept rules to show.", "لا توجد قواعد سماح.")}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
