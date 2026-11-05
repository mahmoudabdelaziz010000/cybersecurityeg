import { useState } from "react";
import { Check, ChevronRight, LockKeyhole, Network, Settings2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language";
import type { Localized, Provider } from "@/lib/xdr-demo";

export type SetupDraft = { environment: string; cadence: string; feeds: string[] };
export function XdrProviderDialog({ provider, draft, onClose, onSave }: {
  provider: Provider; draft?: SetupDraft | undefined; onClose: () => void; onSave: (draft: SetupDraft) => void;
}) {
  const { isArabic } = useLanguage();
  const l = (en: string, ar: string) => isArabic ? ar : en;
  const pair = (value: Localized) => value[isArabic ? 1 : 0];
  const [tab, setTab] = useState("details");
  const [step, setStep] = useState(1);
  const [environment, setEnvironment] = useState(draft?.environment ?? "sandbox");
  const [cadence, setCadence] = useState(draft?.cadence ?? "5");
  const [feeds, setFeeds] = useState(draft?.feeds ?? provider.feeds);
  const [saved, setSaved] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent dir={isArabic ? "rtl" : "ltr"} className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg">
      <DialogHeader className="text-start sm:text-start">
        <span className="mb-2 text-xs font-mono text-caution">{l("IN DEVELOPMENT · NOT CONNECTED", "قيد التطوير · غير متصل")}</span>
        <DialogTitle className="pe-6">{provider.name}</DialogTitle>
        <DialogDescription>{pair(provider.capability)}</DialogDescription>
      </DialogHeader>
      <Tabs value={tab} onValueChange={setTab} dir={isArabic ? "rtl" : "ltr"}>
        <TabsList className="mb-4"><TabsTrigger value="details">{l("Provider details", "تفاصيل المزوّد")}</TabsTrigger><TabsTrigger value="setup">{l("Configuration", "الإعداد")}</TabsTrigger></TabsList>
        <TabsContent value="details" className="space-y-5">
          <div className="flex justify-between gap-4 border-b border-border pb-4 text-sm"><span className="text-muted-foreground">{l("Connection status", "حالة الاتصال")}</span><span className="text-caution">{l(provider.demo ? "Demo data" : "Needs setup", provider.demo ? "بيانات تجريبية" : "يحتاج إلى إعداد")}</span></div>
          <div><h3 className="mb-2 text-sm font-semibold">{l("Available capabilities", "القدرات المتاحة")}</h3><ul className="space-y-2">{provider.feeds.map((feed) => <li key={feed} className="flex items-center gap-2 text-sm"><Check className="size-4 text-primary" />{feed}</li>)}</ul></div>
          <div><h3 className="mb-2 text-sm font-semibold">{l("Authorization requirements", "متطلبات التفويض")}</h3><p className="text-sm leading-relaxed text-muted-foreground">{pair(provider.auth)}</p></div>
          <p className="text-xs text-muted-foreground">{l("Last live sync: Never. Demo fixtures are fixed to 2 Nov 2026, 12:00 UTC.", "آخر مزامنة حقيقية: لم تحدث. العينات ثابتة عند 2 نوفمبر 2026، 12:00 UTC.")}</p>
          <div className="flex flex-wrap gap-2">{provider.id === "sophos" && <Button asChild><Link to="/xdr/firewalls" search={(prev) => ({ ...prev, section: "overview" as const })}><Network />{l("Open firewall dashboard", "فتح لوحة الجدار الناري")}</Link></Button>}<Button variant={provider.id === "sophos" ? "outline" : "default"} onClick={() => setTab("setup")}><Settings2 />{l("Prepare setup draft", "تحضير مسودة إعداد")}</Button></div>
        </TabsContent>
        <TabsContent value="setup" className="space-y-5">
          {saved ? <div className="space-y-4 py-4" role="status"><Check className="size-8 text-primary" /><h3 className="text-lg font-semibold">{l("Prototype draft saved", "تم حفظ المسودة التجريبية")}</h3><p className="text-sm text-muted-foreground">{l("Saved in this page session only. No provider was authorized, no credentials were stored, and no ingestion was started. Connection status remains unchanged.", "حُفظت لهذه الجلسة فقط. لم يتم تفويض المزوّد أو تخزين اعتمادات أو بدء استقبال بيانات. حالة الاتصال لم تتغير.")}</p><Button variant="outline" onClick={onClose}>{l("Done", "تم")}</Button></div> : <>
            <div className="flex items-center gap-3 text-xs font-medium"><span className={step === 1 ? "text-primary" : "text-muted-foreground"}>{l("1 · Configure", "1 · إعداد")}</span><ChevronRight className="size-3" /><span className={step === 2 ? "text-primary" : "text-muted-foreground"}>{l("2 · Review", "2 · مراجعة")}</span></div>
            <div className="border-s-2 border-caution bg-caution/5 p-3"><p className="flex items-center gap-2 text-sm font-semibold text-caution"><LockKeyhole className="size-4" />{l("Never enter secrets here", "لا تدخل أسراراً هنا")}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{l("Credentials belong in secure server-side secrets. Real ingestion requires provider-specific authorization and backend adapters. This prototype does not accept credentials or make provider requests.", "مكان بيانات الاعتماد هو أسرار الخادم الآمنة. يتطلب الاستقبال الحقيقي تفويضاً خاصاً بالمزوّد ومحوّلات خلفية. لا يقبل هذا النموذج اعتمادات ولا يرسل طلبات للمزوّدين.")}</p></div>
            {step === 1 ? <>
              <div><h3 className="text-sm font-semibold">{l("Required for a real connection", "المطلوب للاتصال الحقيقي")}</h3><p className="mt-1 text-xs text-muted-foreground">{l("Requirement checklist only — values are not collected here.", "قائمة متطلبات فقط — لا يتم جمع القيم هنا.")}</p><ul className="mt-3 divide-y divide-border rounded-md border border-border">{provider.fields.map((field) => <li className="flex items-start justify-between gap-3 p-3 text-sm" key={field[0]}><span>{pair(field)}</span><LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /></li>)}</ul></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm" id="xdr-environment-label">{l("Environment", "البيئة")}</label><Select value={environment} onValueChange={setEnvironment}><SelectTrigger aria-labelledby="xdr-environment-label"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sandbox">{l("Sandbox", "بيئة اختبار")}</SelectItem><SelectItem value="staging">{l("Staging", "قبل الإنتاج")}</SelectItem><SelectItem value="production">{l("Production (planned)", "الإنتاج (مخطط)")}</SelectItem></SelectContent></Select></div><div className="space-y-2"><label className="text-sm" id="xdr-cadence-label">{l("Target sync interval", "فترة المزامنة المطلوبة")}</label><Select value={cadence} onValueChange={setCadence}><SelectTrigger aria-labelledby="xdr-cadence-label"><SelectValue /></SelectTrigger><SelectContent>{["1", "5", "15"].map((value) => <SelectItem key={value} value={value}>{value} {l("minutes", "دقائق")}</SelectItem>)}</SelectContent></Select></div></div>
              <fieldset><legend className="mb-2 text-sm">{l("Planned event streams", "مسارات الأحداث المخططة")}</legend><div className="flex flex-wrap gap-2">{provider.feeds.map((feed) => <Button key={feed} variant={feeds.includes(feed) ? "secondary" : "outline"} aria-pressed={feeds.includes(feed)} onClick={() => setFeeds((current) => current.includes(feed) ? current.filter((f) => f !== feed) : [...current, feed])}>{feeds.includes(feed) && <Check />}{feed}</Button>)}</div></fieldset>
              {feeds.length === 0 && <p className="text-xs text-caution">{l("Select at least one stream.", "اختر مساراً واحداً على الأقل.")}</p>}
              <Button disabled={!feeds.length} onClick={() => setStep(2)}>{l("Review draft", "مراجعة المسودة")}<ChevronRight /></Button>
            </> : <>
              <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{l("Environment", "البيئة")}</dt><dd>{l(environment, environment === "sandbox" ? "بيئة اختبار" : environment === "staging" ? "قبل الإنتاج" : "الإنتاج (مخطط)")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{l("Target sync interval", "فترة المزامنة المطلوبة")}</dt><dd>{cadence} {l("minutes", "دقائق")}</dd></div><div><dt className="text-muted-foreground">{l("Planned event streams", "مسارات الأحداث المخططة")}</dt><dd className="mt-1">{feeds.join(" · ")}</dd></div></dl>
              <p className="text-sm text-muted-foreground">{pair(provider.auth)}</p><p className="text-xs text-caution">{l("Adapter not implemented. Saving this draft does not connect the provider.", "المحوّل غير منفّذ. حفظ المسودة لا يربط المزوّد.")}</p>
              <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setStep(1)}>{l("Back", "رجوع")}</Button><Button onClick={() => { onSave({ environment, cadence, feeds }); setSaved(true); }}>{l("Save prototype draft", "حفظ المسودة التجريبية")}</Button></div>
            </>}
          </>}
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>;
}