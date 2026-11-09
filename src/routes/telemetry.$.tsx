import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { TelemetryGroupPage, TelemetrySourcePage } from "@/components/telemetry-pages";
import { GROUP_BLURB, SOPHOS_PROVIDER_ID, parseTelemetryPath, telemetryPath } from "@/lib/console-nav";
import { absoluteUrl, headLanguage, pageHead } from "@/lib/seo";
import { groupLabel } from "@/lib/xdr-ui";

/**
 * One route serves every telemetry page: /telemetry/firewalls, /telemetry/firewalls/paloalto, ...
 * The splat is validated against the provider catalog; anything else is a real 404.
 */
export const Route = createFileRoute("/telemetry/$")({
  beforeLoad: ({ params }) => {
    const target = parseTelemetryPath(params._splat);
    if (!target) throw notFound();
    // Sophos has a live dashboard instead of a sample-data page.
    if (target.provider?.id === SOPHOS_PROVIDER_ID) throw redirect({ to: "/xdr/firewalls", statusCode: 301 });
  },
  head: (ctx) => {
    const target = parseTelemetryPath(ctx.params._splat);
    if (!target) return { meta: [{ title: "Page not found | SentinelGrid" }, { name: "robots", content: "noindex" }] };
    const { group, provider } = target;
    const lang = headLanguage(ctx);
    const ar = lang === "ar";
    const groupName = groupLabel(group, false);
    const groupNameAr = groupLabel(group, true);
    const path = telemetryPath(group, provider);
    const title = provider
      ? ar ? `بيانات ${provider.name} | SentinelGrid` : `${provider.name} Telemetry | SentinelGrid`
      : ar ? `لوحة بيانات ${groupNameAr} | SentinelGrid` : `${groupName} Telemetry Dashboard | SentinelGrid`;
    const summary = (provider ? provider.capability : GROUP_BLURB[group])[ar ? 1 : 0];
    const description = `${summary} ${ar ? "بيانات تجريبية فقط." : "Sample data only."}`;
    const base = pageHead({ path, title, description, lang });
    const crumbs = [
      { name: "Dashboard", path: "/" },
      { name: groupName, path: telemetryPath(group) },
      ...(provider ? [{ name: provider.name, path }] : []),
    ];
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: absoluteUrl(crumb.path) })),
          }),
        },
      ],
    };
  },
  component: TelemetryRoute,
});

function TelemetryRoute() {
  const { _splat } = Route.useParams();
  const target = parseTelemetryPath(_splat);
  if (!target) return null;
  return target.provider ? <TelemetrySourcePage group={target.group} provider={target.provider} /> : <TelemetryGroupPage group={target.group} />;
}
