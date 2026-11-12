import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Globe2,
  Loader2,
  LogIn,
  Plus,
  Radar,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/language";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import type {
  CampaignMatch,
  DomainAssessment,
  MonitoredDomain,
  SurfaceEvidence,
} from "@/lib/attack-surface";
import {
  listAttackSurfaceDomains,
  registerAttackSurfaceDomain,
  removeAttackSurfaceDomain,
  runAttackSurfaceAssessment,
  verifyAttackSurfaceDomain,
} from "@/lib/attack-surface.functions";

export function CustomDomainMonitor() {
  const { isArabic } = useLanguage();
  const l = useCallback((en: string, ar: string) => (isArabic ? ar : en), [isArabic]);
  const list = useServerFn(listAttackSurfaceDomains);
  const register = useServerFn(registerAttackSurfaceDomain);
  const verify = useServerFn(verifyAttackSurfaceDomain);
  const assess = useServerFn(runAttackSurfaceAssessment);
  const remove = useServerFn(removeAttackSurfaceDomain);
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [usage, setUsage] = useState<{ planName: string; used: number; limit: number | null } | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [challenge, setChallenge] = useState<{
    domainId: string;
    fqdn: string;
    recordName: string;
    value: string;
    expiresAt: string;
  } | null>(null);
  const [assessment, setAssessment] = useState<DomainAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const result = await list();
    setDomains(result.domains);
    setUsage(result.usage);
  }, [list]);
  useEffect(() => {
    void reload().catch((failure) =>
      setError(
        failure instanceof Error
          ? failure.message
          : l("Sign in to manage monitored domains.", "سجّل الدخول لإدارة النطاقات المراقبة."),
      ),
    );
  }, [reload, l]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    }).catch(() => {
      if (active) setSignedIn(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      if (session) window.setTimeout(() => void reload(), 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [reload]);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("lovable", {
        redirect_uri: window.location.href,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        const { data } = await supabase.auth.getSession();
        setSignedIn(Boolean(data.session));
        if (data.session) await reload();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : l("Sign-in failed.", "فشل تسجيل الدخول."));
    } finally {
      setBusy(false);
    }
  }

  async function addDomain(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setAssessment(null);
    try {
      const response = await register({ data: { domain: domainInput } });
      setChallenge({
        domainId: response.id,
        fqdn: response.fqdn,
        recordName: response.recordName,
        value: response.challenge,
        expiresAt: response.expiresAt,
      });
      setDomainInput("");
      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : l("Could not start verification.", "تعذر بدء التحقق."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyDomain(domainId: string) {
    setBusy(true);
    setError(null);
    try {
      await verify({ data: { domainId } });
      setChallenge(null);
      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : l("Domain verification failed.", "فشل التحقق من النطاق."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function runAssessment(domainId: string) {
    setBusy(true);
    setError(null);
    setAssessment(null);
    try {
      setAssessment((await assess({ data: { domainId } })) as DomainAssessment);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : l("Assessment failed.", "فشل التقييم."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeDomain(domainId: string) {
    setBusy(true);
    setError(null);
    try {
      await remove({ data: { domainId } });
      if (challenge?.domainId === domainId) setChallenge(null);
      if (assessment) setAssessment(null);
      await reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : l("Could not remove domain.", "تعذر حذف النطاق."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 space-y-5" aria-labelledby="custom-domain-monitor-title">
      <header className="surface relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -end-12 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-mono flex items-center gap-2">
              <Radar className="size-4 text-primary" />
              {l("AUTHORIZED SCOPE · PASSIVE SOURCES", "نطاق مصرح · مصادر سلبية")}
            </p>
            <h2 id="custom-domain-monitor-title" className="mt-2 text-2xl font-semibold">
              {l(
                "Custom Attack Surface & Threat Monitoring",
                "مراقبة مخصصة لسطح الهجوم والتهديدات",
              )}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {l(
                "Verify domain control with a DNS TXT record, then review passive DNS, registration and certificate evidence alongside public phishing and malware campaign matches. No domain is contacted by the campaign checks.",
                "أثبت التحكم بالنطاق عبر سجل DNS TXT، ثم راجع بيانات DNS والتسجيل والشهادات السلبية مع تطابقات حملات التصيد والبرمجيات الخبيثة العامة. لا تتصل فحوصات الحملات بالنطاقات المرصودة.",
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-clean/30 bg-clean/10 px-3 py-1.5 text-xs text-clean">
            <CheckCircle2 className="size-3.5" />
            {l("Ownership required", "إثبات الملكية مطلوب")}
          </span>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="surface p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Globe2 className="size-4 text-primary" />
            {l("My authorized domains", "نطاقاتي المصرح بها")}
          </h3>
          {usage && (
            <p className="mt-2 text-xs text-muted-foreground">
              {usage.limit === null
                ? l(`${usage.planName} · ${usage.used} domains monitored`, `${usage.planName} · تتم مراقبة ${usage.used} نطاقات`)
                : l(`${usage.planName} · ${usage.used} of ${usage.limit} monitored domains`, `${usage.planName} · ${usage.used} من ${usage.limit} نطاقات مراقبة`)}
            </p>
          )}
          {signedIn === false && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                {l("Sign in to add and manage domains verified by your organization.", "سجّل الدخول لإضافة النطاقات التي تثبت مؤسستك ملكيتها وإدارتها.")}
              </p>
              <button
                type="button"
                onClick={() => void signIn()}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <LogIn className="size-4" />
                {l("Sign in with Lovable", "تسجيل الدخول عبر Lovable")}
              </button>
            </div>
          )}
          <form onSubmit={addDomain} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="monitor-domain" className="sr-only">
              {l("Domain name", "اسم النطاق")}
            </label>
            <input
              id="monitor-domain"
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              disabled={busy || signedIn === false}
              spellCheck={false}
              placeholder="example.com"
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              disabled={busy || signedIn === false || !domainInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="size-4" />
              {l("Add domain", "إضافة نطاق")}
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            {l(
              "A DNS TXT proof is required. Only the exact verified domain and its certificate-listed subdomains are included.",
              "يلزم إثبات DNS TXT. يشمل الفحص النطاق الموثق ونطاقاته الفرعية الظاهرة في الشهادات فقط.",
            )}
          </p>
          {domains.length === 0 ? (
            <p className="mt-5 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {l(
                "No domains registered yet. Sign in, add a domain, and publish the requested TXT value to verify it.",
                "لا توجد نطاقات مسجلة. سجّل الدخول وأضف نطاقاً وانشر قيمة TXT المطلوبة للتحقق.",
              )}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {domains.map((domain) => (
                <li
                  key={domain.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm">{domain.fqdn}</p>
                    <p
                      className={`mt-1 text-xs ${domain.verifiedAt ? "text-clean" : "text-caution"}`}
                    >
                      {domain.verifiedAt
                        ? l("Verified", "موثق")
                        : l("Verification pending", "بانتظار التحقق")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {domain.verifiedAt ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAssessment(domain.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                      >
                        <RefreshCw className="size-3.5" />
                        {l("Assess", "تقييم")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void verifyDomain(domain.id)}
                        className="rounded-md border border-primary/30 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/5 disabled:opacity-50"
                      >
                        {l("Verify TXT", "تحقق من TXT")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeDomain(domain.id)}
                      aria-label={l(`Remove ${domain.fqdn}`, `حذف ${domain.fqdn}`)}
                      className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-malicious disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {challenge && (
            <div className="mt-4 rounded-md border border-caution/30 bg-caution/5 p-4">
              <p className="text-sm font-semibold">
                {l(
                  "Publish this TXT record to prove domain control",
                  "انشر سجل TXT هذا لإثبات التحكم بالنطاق",
                )}
              </p>
              <p className="mt-2 break-all font-mono text-xs">{challenge.recordName}</p>
              <p className="mt-1 break-all rounded bg-background p-2 font-mono text-xs">
                {challenge.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {l("Expires", "ينتهي")}:{" "}
                {new Date(challenge.expiresAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void verifyDomain(challenge.domainId)}
                className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {l("Check DNS record", "تحقق من سجل DNS")}
              </button>
            </div>
          )}
        </div>

        <div className="surface p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="size-4 text-primary" />
            {l("Surface evidence & campaign matches", "أدلة السطح وتطابقات الحملات")}
          </h3>
          {busy && (
            <p
              className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin" />
              {l("Working…", "جارٍ التنفيذ…")}
            </p>
          )}
          {!assessment && !busy && (
            <p className="mt-4 text-sm text-muted-foreground">
              {l(
                "Select Assess on a verified domain to collect passive evidence and check conservative brand variants against configured campaign sources.",
                "اختر تقييم لنطاق موثق لجمع الأدلة السلبية وفحص صيغ محدودة للاسم التجاري في مصادر الحملات المضبوطة.",
              )}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-malicious/30 bg-malicious/5 p-3 text-sm text-malicious"
            >
              {error}
            </p>
          )}
          {assessment && (
            <div className="mt-4 space-y-5">
              <p className="text-xs text-muted-foreground">
                {l("Last assessed", "آخر تقييم")}:{" "}
                {new Date(assessment.assessedAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}
              </p>
              <div>
                <p className="label-mono">
                  {l("PASSIVE DOMAIN OBSERVATIONS", "ملاحظات النطاق السلبية")}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {assessment.surface.map((evidence) => (
                    <article key={evidence.source} className="rounded-md border border-border p-3">
                      <p className="text-xs font-semibold">{evidence.source}</p>
                      {Object.entries(evidence.records).map(([kind, values]) => (
                        <p
                          key={kind}
                          className="mt-1 break-words text-[11px] text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">{kind}:</span>{" "}
                          {values.length ? values.slice(0, 8).join(", ") : "—"}
                          {values.length > 8 ? ` · +${values.length - 8}` : ""}
                        </p>
                      ))}
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {l("Observed", "وقت الرصد")}:{" "}
                        {new Date(evidence.observedAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
              <div>
                <p className="label-mono">{l("CAMPAIGN INTELLIGENCE", "استخبارات الحملات")}</p>
                {assessment.campaignMatches.length === 0 ? (
                  <p className="mt-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
                    {l(
                      "No exact or candidate matches returned by configured sources. This is not proof of safety.",
                      "لم تُرجع المصادر المضبوطة تطابقات مباشرة أو مرشحة. وهذا لا يثبت السلامة.",
                    )}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {assessment.campaignMatches.map((match) => (
                      <li
                        key={match.candidateDomain}
                        className="rounded-md border border-malicious/20 bg-malicious/5 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="break-all font-mono text-xs">
                            {match.candidateDomain}
                          </span>
                          <span className="rounded-full border border-caution/30 px-2 py-0.5 text-[10px] uppercase text-caution">
                            {match.relationship === "exact-domain"
                              ? l("Exact IOC", "مؤشر مطابق")
                              : l("Review candidate", "مرشح للمراجعة")}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{match.reason}</p>
                        {match.sources
                          .filter((source) => source.findings.length)
                          .map((source) => (
                            <div
                              key={source.source}
                              className="mt-2 border-t border-border/70 pt-2"
                            >
                              <p className="text-[11px] font-semibold">{source.source}</p>
                              {source.findings.map((finding) => (
                                <p
                                  key={finding.id}
                                  className="mt-1 break-words text-[11px] text-muted-foreground"
                                >
                                  {finding.title} · {finding.detail}
                                  {finding.observedAt ? ` · ${finding.observedAt}` : ""}
                                </p>
                              ))}
                            </div>
                          ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
