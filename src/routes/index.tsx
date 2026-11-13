import { Link, createFileRoute } from "@tanstack/react-router";
import { SocDashboard } from "@/components/soc-dashboard";
import { GROUP_BLURB, telemetrySplat } from "@/lib/console-nav";
import { useLanguage } from "@/lib/language";
import { headLanguage, pageHead, WHATSAPP_NUMBER } from "@/lib/seo";
import { GROUPS } from "@/lib/xdr-demo";
import { groupLabel } from "@/lib/xdr-ui";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

const TITLE = "Cybersecurity Consulting in Egypt | SentinelGrid";
const DESCRIPTION =
  "Discuss cybersecurity consulting for security assessments, attack-surface reviews, SOC/XDR and firewall security in Egypt. Contact SentinelGrid on WhatsApp.";

export const Route = createFileRoute("/")({
  head: (ctx) => ({
    ...pageHead({ path: "/", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx) }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "SentinelGrid XDR Console",
          applicationCategory: "SecurityApplication",
          operatingSystem: "Web",
          description: DESCRIPTION,
          featureList: [
            "SOC dashboard",
            "Firewall, endpoint, server, cloud, network and email telemetry",
            "Live read-only Sophos Firewall (NGFW) dashboard",
            "OSINT data hub",
            "OWASP scanner",
            "Security Assessment Center",
            "Attack surface monitoring",
          ],
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to use, with no signup." },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: "SentinelGrid Cybersecurity Consulting",
          url: "https://cybersecurityeg.lovable.app/",
          telephone: `+${WHATSAPP_NUMBER}`,
          areaServed: { "@type": "Country", name: "Egypt" },
          serviceType: ["Cybersecurity consulting", "Security assessments", "Attack surface review", "SOC and XDR advisory", "Firewall security"],
          contactPoint: { "@type": "ContactPoint", telephone: `+${WHATSAPP_NUMBER}`, contactType: "sales", availableLanguage: ["English", "Arabic"] },
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { isArabic } = useLanguage();
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  const idx = isArabic ? 1 : 0;
  return (
    <>
      <SocDashboard />
      {/* Crawlable overview of what the console covers, with links to every telemetry dashboard. */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6" aria-labelledby="about-heading" data-no-translate>
        <h2 id="about-heading" className="text-xl font-semibold">{l("About the SentinelGrid XDR console", "عن لوحة SentinelGrid للكشف والاستجابة الموسّعة")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {l(
            "SentinelGrid brings threats, endpoint health and telemetry from your firewalls, endpoints, servers, cloud accounts, network sensors and email into one SOC dashboard. Every telemetry source has its own dashboard, and the Sophos Firewall (NGFW) view reads live, read-only settings. Alongside it sit passive OSINT lookups, an OWASP scanner, automation workflows and attack surface monitoring.",
            "تجمع SentinelGrid التهديدات وصحة الأجهزة وبيانات الجدران النارية والأجهزة الطرفية والخوادم والسحابة ومستشعرات الشبكة والبريد في لوحة واحدة لمركز العمليات الأمنية. لكل مصدر بيانات لوحته الخاصة، وتعرض لوحة Sophos Firewall (NGFW) إعدادات مباشرة للقراءة فقط. إلى جانبها بحث OSINT سلبي وفاحص OWASP وسير عمل آلي ومراقبة سطح الهجوم.",
          )}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group) => (
            <li key={group}>
              <Link to="/telemetry/$" params={{ _splat: telemetrySplat(group) }} className="surface block h-full p-4 transition-colors hover:bg-accent/40">
                <span className="text-sm font-semibold">{groupLabel(group, isArabic)}</span>
                <span className="mt-1.5 line-clamp-3 block text-xs leading-relaxed text-muted-foreground">{GROUP_BLURB[group][idx]}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/assessment-center" className="surface mt-5 flex flex-wrap items-center justify-between gap-4 border-primary/30 p-5 transition-colors hover:border-primary/60 hover:bg-accent/30">
          <span className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" aria-hidden="true" /></span><span><span className="block font-semibold">{l("Security Assessment Center", "مركز التقييم الأمني")}</span><span className="mt-1 block text-sm text-muted-foreground">{l("Run OSINT, OWASP and vulnerability checks together, then review live evidence in one workspace.", "شغّل فحوصات OSINT وOWASP والثغرات معاً، وراجع الأدلة المباشرة في مساحة واحدة.")}</span></span></span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">{l("Open assessment center", "فتح مركز التقييم")} <ArrowUpRight className="size-4" aria-hidden="true" /></span>
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">
          {l("Also: ", "أيضاً: ")}
          <Link to="/osint-hub" className="text-primary hover:underline">{l("OSINT Data Hub", "مركز OSINT")}</Link> · <Link to="/owasp" className="text-primary hover:underline">{l("OWASP Scanner", "فاحص OWASP")}</Link> · <Link to="/workflows" className="text-primary hover:underline">{l("Automation Workflows", "سير العمل الآلي")}</Link> · <Link to="/attack-surface" className="text-primary hover:underline">{l("Attack Surface Monitoring", "مراقبة سطح الهجوم")}</Link> · <Link to="/threat-intel" className="text-primary hover:underline">{l("Threat Intelligence", "استخبارات التهديدات")}</Link> · <Link to="/platform" className="text-primary hover:underline">{l("Platform overview", "نظرة عامة على المنصة")}</Link>
        </p>
      </section>
    </>
  );
}
