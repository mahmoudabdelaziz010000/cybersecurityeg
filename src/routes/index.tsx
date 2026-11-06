import { Link, createFileRoute } from "@tanstack/react-router";
import { SocDashboard } from "@/components/soc-dashboard";
import { GROUP_BLURB, telemetrySplat } from "@/lib/console-nav";
import { useLanguage } from "@/lib/language";
import { headLanguage, pageHead } from "@/lib/seo";
import { GROUPS } from "@/lib/xdr-demo";
import { groupLabel } from "@/lib/xdr-ui";

const TITLE = "SentinelGrid XDR Console | SOC Dashboard & Telemetry";
const DESCRIPTION =
  "Free XDR console: SOC dashboard, firewall, endpoint, server, cloud and email telemetry, a live Sophos Firewall view, plus OSINT and OWASP tools.";

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
            "Attack surface monitoring",
          ],
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to use, with no signup." },
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
        <p className="mt-6 text-sm text-muted-foreground">
          {l("Also: ", "أيضاً: ")}
          <Link to="/osint-hub" className="text-primary hover:underline">{l("OSINT Data Hub", "مركز OSINT")}</Link> · <Link to="/owasp" className="text-primary hover:underline">{l("OWASP Scanner", "فاحص OWASP")}</Link> · <Link to="/workflows" className="text-primary hover:underline">{l("Automation Workflows", "سير العمل الآلي")}</Link> · <Link to="/attack-surface" className="text-primary hover:underline">{l("Attack Surface Monitoring", "مراقبة سطح الهجوم")}</Link> · <Link to="/threat-intel" className="text-primary hover:underline">{l("Threat Intelligence", "استخبارات التهديدات")}</Link> · <Link to="/platform" className="text-primary hover:underline">{l("Platform overview", "نظرة عامة على المنصة")}</Link>
        </p>
      </section>
    </>
  );
}
