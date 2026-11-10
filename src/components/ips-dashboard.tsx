import type { ReactNode } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ipsStats } from "@/lib/ips-stats";
import { sophosLabel, type IpsData } from "@/lib/sophos-catalog";

export type IpsTab = "dashboard" | "signatures" | "policies" | "coverage";

const SEV_BAR: Record<string, string> = { Critical: "bg-malicious", High: "bg-caution", Medium: "bg-xdr-cloud", Low: "bg-primary" };
const SEV_TEXT: Record<string, string> = { Critical: "text-malicious", High: "text-caution", Medium: "text-xdr-cloud", Low: "text-primary" };

/** Ring chart drawn with stroke-dasharray; `segments` are fractions of `total`. */
function Ring({ segments, total, label, center, sub }: { segments: { value: number; className: string }[]; total: number; label: string; center: string; sub: string }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative size-40 shrink-0" dir="ltr">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90" role="img" aria-label={label}>
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-muted" />
        {total > 0 && segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const circle = <circle key={index} cx="64" cy="64" r={r} fill="none" strokeWidth="12" className={segment.className}
            strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold">{center}</span>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

function Legend({ items }: { items: { dot: string; label: string; value: ReactNode }[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${item.dot}`} />
          <span className="text-muted-foreground">{item.label}</span>
          <strong className="ms-auto ps-4 font-mono" dir="ltr">{item.value}</strong>
        </li>
      ))}
    </ul>
  );
}

function Panel({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="surface space-y-4 p-5" aria-labelledby={id}>
      <div><h3 id={id} className="font-semibold">{title}</h3>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div>
      {children}
    </section>
  );
}

export function IpsDashboard({ ips, isArabic, onOpen }: { ips: IpsData; isArabic: boolean; onOpen: (tab: IpsTab) => void }) {
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const stats = ipsStats(ips);
  const maxSeverity = Math.max(1, ...stats.severity.map((item) => item.count));
  const maxCategory = Math.max(1, ...stats.categories.map((item) => item.count));
  const maxHits = Math.max(1, ...stats.timeline);
  const coverageTone = stats.coveragePercent === null ? "stroke-muted-foreground" : stats.coveragePercent === 100 ? "stroke-clean" : stats.coveragePercent >= 50 ? "stroke-caution" : "stroke-malicious";
  const tiles = [
    [l("IPS policies", "سياسات IPS"), String(ips.policies.length), l("Read from firewall configuration", "من إعدادات الجدار الناري"), "text-foreground"],
    [l("Signatures / rule groups", "التواقيع / مجموعات القواعد"), String(stats.total), l("Available in this source", "المتاح في هذا المصدر"), "text-foreground"],
    [l("Unprotected rules", "قواعد غير محمية"), stats.totalRules ? String(stats.uncovered.length) : "—", l("Accept rules without IPS", "قواعد سماح بدون IPS"), stats.uncovered.length ? "text-caution" : "text-clean"],
    [l("Disabled", "معطّلة"), String(stats.disabled), l("Signatures switched off", "تواقيع متوقفة"), stats.disabled ? "text-caution" : "text-foreground"],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel id="ips-protection" title={l("Protection coverage", "تغطية الحماية")} hint={l("Share of firewall accept rules that have an IPS policy.", "نسبة قواعد السماح التي لديها سياسة IPS.")}>
          <div className="flex flex-wrap items-center gap-6">
            <Ring total={stats.totalRules} segments={[{ value: stats.coveredRules, className: coverageTone }]}
              label={l(`${stats.coveredRules} of ${stats.totalRules} rules protected`, `${stats.coveredRules} من ${stats.totalRules} قاعدة محمية`)}
              center={stats.coveragePercent === null ? "—" : `${stats.coveragePercent}%`} sub={l("protected", "محمية")} />
            <div className="min-w-48 flex-1 space-y-3">
              <Legend items={[
                { dot: "bg-clean", label: l("Protected rules", "قواعد محمية"), value: stats.coveredRules },
                { dot: "bg-muted-foreground", label: l("Unprotected rules", "قواعد غير محمية"), value: stats.uncovered.length },
              ]} />
              <Button variant="outline" size="sm" onClick={() => onOpen("coverage")}>{l("Inspect rule coverage", "استعراض تغطية القواعد")}</Button>
            </div>
          </div>
        </Panel>

        <Panel id="ips-actions" title={l("Prevention mode", "وضع المنع")} hint={l("Signatures that block versus those that only detect.", "التواقيع التي تحظر مقابل التي تكتفي بالكشف.")}>
          <div className="flex flex-wrap items-center gap-6">
            <Ring total={stats.total} segments={[{ value: stats.blocking, className: "stroke-clean" }, { value: stats.detectOnly, className: "stroke-caution" }]}
              label={l(`${stats.blocking} blocking, ${stats.detectOnly} detect-only`, `${stats.blocking} حظر، ${stats.detectOnly} كشف فقط`)}
              center={String(stats.total)} sub={l("signatures", "توقيع")} />
            <div className="min-w-48 flex-1 space-y-3">
              <Legend items={[
                { dot: "bg-clean", label: l("Blocking (Drop / Recommended)", "حظر (Drop / موصى به)"), value: stats.blocking },
                { dot: "bg-caution", label: l("Detect-only", "كشف فقط"), value: stats.detectOnly },
              ]} />
              <Button variant="outline" size="sm" onClick={() => onOpen("signatures")}>{l("Browse signatures", "تصفح التواقيع")}</Button>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([label, value, detail, tone]) => (
          <article key={label} className="surface min-w-0 p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-3 font-display text-3xl font-semibold ${tone}`}>{value}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel id="ips-severity" title={l("Severity breakdown", "توزيع الخطورة")} hint={l("Signature rule groups returned by the firewall.", "مجموعات قواعد التواقيع التي أعادها الجدار الناري.")}>
          <div className="space-y-3">
            {stats.severity.map(({ level, count }) => (
              <div key={level} className="grid grid-cols-[72px_1fr_32px] items-center gap-3 text-xs">
                <span className={SEV_TEXT[level]}>{sophosLabel(`ui.severity.${level}`, isArabic)}</span>
                <div className="h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${SEV_BAR[level]}`} style={{ width: `${Math.round((count / maxSeverity) * 100)}%` }} /></div>
                <span className="text-end font-mono" dir="ltr">{count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel id="ips-categories" title={l("Top categories", "أكثر الفئات")} hint={l("Where most signatures sit.", "الفئات الأكثر تواقيعاً.")}>
          {stats.categories.length === 0 && <p className="text-sm text-muted-foreground">{l("No signature categories returned.", "لم تُرجع أي فئات.")}</p>}
          <div className="space-y-3">
            {stats.categories.map(({ name, count }) => (
              <div key={name} className="grid grid-cols-[minmax(0,120px)_1fr_32px] items-center gap-3 text-xs">
                <span className="truncate" dir="auto" title={name}>{name}</span>
                <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((count / maxCategory) * 100)}%` }} /></div>
                <span className="text-end font-mono" dir="ltr">{count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {stats.timeline.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel id="ips-timeline" title={l("Hits, last 24 hours", "الإصابات خلال 24 ساعة")} hint={l("Sample data: the read-only API does not expose hit counts.", "بيانات تجريبية: الواجهة للقراءة فقط ولا تعرض عدد الإصابات.")}>
            <div className="flex h-36 items-end gap-1.5" dir="ltr" role="img" aria-label={l(`Hits per 2 hours: ${stats.timeline.join(", ")}`, `الإصابات كل ساعتين: ${stats.timeline.join("، ")}`)}>
              {stats.timeline.map((value, index) => (
                <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <i title={`${value}`} className="w-full rounded-t-sm bg-primary/70" style={{ height: `${Math.max(3, (value / maxHits) * 100)}%` }} />
                  <span className="text-[10px] text-muted-foreground">{index * 2}h</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel id="ips-top" title={l("Top signatures by hits", "أكثر التواقيع إصابة")}>
            <ol className="space-y-2 text-sm">
              {stats.topByHits.map(({ signature, total }) => (
                <li key={signature.id} className="flex items-center justify-between gap-3">
                  <span className="truncate" dir="auto" title={signature.name}>{signature.name}</span>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">{total}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel id="ips-policy-posture" title={l("Policy posture", "حالة السياسات")} hint={l("Blocking and detect-only rule groups by policy.", "مجموعات قواعد الحظر والكشف فقط حسب السياسة.")}>
          {ips.policies.length === 0 && <p className="text-sm text-muted-foreground">{l("No IPS policies were returned by this source.", "لم يُرجع هذا المصدر سياسات IPS.")}</p>}
          {ips.policies.map((item) => {
            const blockingPercent = Math.round((item.blocking / Math.max(1, item.rules)) * 100);
            return (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium" dir="auto">{item.name}</span><span className="font-mono text-xs text-muted-foreground" dir="ltr">{item.rules} {l("groups", "مجموعات")}</span></div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={l(`${blockingPercent}% blocking in ${item.name}`, `${blockingPercent}% حظر في ${item.name}`)}>
                  <div className="bg-clean" style={{ width: `${blockingPercent}%` }} /><div className="bg-caution" style={{ width: `${100 - blockingPercent}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground"><span className="text-clean">{item.blocking} {l("blocking", "حظر")}</span><span className="text-caution">{item.detectOnly} {l("detect-only", "كشف فقط")}</span></div>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => onOpen("policies")}>{l("Inspect policies", "استعراض السياسات")}</Button>
        </Panel>

        <Panel id="ips-attention" title={l("Needs attention", "يحتاج إلى انتباه")} hint={l("Accept rules that pass traffic without IPS inspection.", "قواعد سماح تمرر الحركة دون فحص IPS.")}>
          {stats.totalRules === 0 ? (
            <p className="text-sm text-muted-foreground">{l("No accept rules to evaluate.", "لا توجد قواعد سماح للتقييم.")}</p>
          ) : stats.uncovered.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-clean"><ShieldCheck className="size-4" />{l("Every accept rule has an IPS policy.", "كل قواعد السماح لديها سياسة IPS.")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.uncovered.slice(0, 5).map((rule, index) => (
                <li key={`${rule.rule}-${index}`} className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-caution" />
                  <span className="truncate" dir="auto">{rule.rule}</span>
                  <span className="ms-auto shrink-0 text-xs text-muted-foreground" dir="auto">{rule.from} → {rule.to}</span>
                </li>
              ))}
              {stats.uncovered.length > 5 && <li className="text-xs text-muted-foreground">{l(`+${stats.uncovered.length - 5} more`, `+${stats.uncovered.length - 5} أخرى`)}</li>}
            </ul>
          )}
        </Panel>
      </div>

      <section className="surface flex flex-wrap items-start justify-between gap-3 p-5" aria-label={l("IPS event monitoring status", "حالة مراقبة أحداث IPS")}>
        <div><h3 className="font-semibold">{l("IPS event monitoring", "مراقبة أحداث IPS")}</h3><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{l("This read-only configuration API response does not include event logs. No live attack events are being shown here.", "استجابة واجهة الإعدادات للقراءة فقط لا تتضمن سجلات الأحداث. لا تُعرض هنا أحداث هجوم مباشرة.")}</p></div>
        <a href="/ips/#ips-lab" className="text-sm font-medium text-primary hover:underline">{l("Open simulated lab and log parser", "افتح المختبر التجريبي ومحلل السجلات")}</a>
      </section>
    </div>
  );
}
