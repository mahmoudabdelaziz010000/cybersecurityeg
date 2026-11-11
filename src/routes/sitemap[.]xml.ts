import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { allTelemetryPaths } from "@/lib/console-nav";
import { localizedUrl } from "@/lib/seo";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const BUILD_DATE = new Date().toISOString().slice(0, 10);

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Date of the deployment's first sitemap request; refreshed whenever the server restarts on a new build.
        const lastmod = BUILD_DATE;
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/platform", changefreq: "monthly", priority: "0.8" },
          { path: "/xdr", changefreq: "monthly", priority: "0.7" },
          { path: "/assessment-center", changefreq: "monthly", priority: "0.9" },
          ...allTelemetryPaths().map((path): SitemapEntry => ({ path, changefreq: "monthly", priority: path.split("/").length > 3 ? "0.6" : "0.7" })),
          { path: "/osint-hub", changefreq: "weekly", priority: "0.9" },
          { path: "/owasp", changefreq: "weekly", priority: "0.9" },
          { path: "/workflows", changefreq: "weekly", priority: "0.9" },
          { path: "/attack-surface", changefreq: "monthly", priority: "0.8" },
          { path: "/threat-intel", changefreq: "daily", priority: "0.8" },
          { path: "/ips/", changefreq: "weekly", priority: "0.9" },
          ...["how-ips-works", "ids-vs-ips", "sophos-firewall-ips", "suricata-ips", "snort-ips", "attack-signatures", "ips-vs-firewall", "cve-threat-detection"].map((slug): SitemapEntry => ({ path: `/ips/${slug}/`, changefreq: "monthly", priority: "0.8" })),
          { path: "/recon-guide", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "yearly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
        ];

        // One <url> per language, each listing both versions, so search engines index the Arabic pages
        // and serve them to Arabic searchers.
        const urls = entries.flatMap((e) =>
          (["en", "ar"] as const).map((lang) =>
            [
              `  <url>`,
              `    <loc>${escapeXml(localizedUrl(e.path, lang))}</loc>`,
              `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(localizedUrl(e.path, "en"))}"/>`,
              `    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(localizedUrl(e.path, "ar"))}"/>`,
              `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(e.path, "en"))}"/>`,
              `    <lastmod>${lastmod}</lastmod>`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
