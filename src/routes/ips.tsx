import { createFileRoute, Link } from "@tanstack/react-router";
import { headLanguage, pageHead } from "@/lib/seo";
import { IPS_ARTICLES } from "@/lib/ips-content";
import { IpsDashboard, IpsKnowledgeCenter } from "@/components/ips-center-panels";

const TITLE = "IPS Security Center: Intrusion Prevention Guides and Lab | SentinelGrid";
const DESCRIPTION = "Learn intrusion prevention fundamentals, compare IDS and IPS, explore Sophos, Suricata and Snort, and try a browser-only simulated IPS lab.";

export const Route = createFileRoute("/ips")({
  head: (ctx) => ({ ...pageHead({ path: "/ips/", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx), type: "website" }), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: TITLE, description: DESCRIPTION, url: "https://cybersecurityeg.lovable.app/ips/", hasPart: IPS_ARTICLES.map((a) => ({ "@type": "Article", headline: a.title, description: a.description, url: `https://cybersecurityeg.lovable.app/ips/${a.slug}/` })) }) }] }),
  component: IpsHome,
});

function IpsHome() {
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
    <header className="max-w-3xl"><p className="label-mono">IPS Security Center</p><h1 className="mt-3 text-4xl font-bold">Intrusion prevention, explained and explored</h1><p className="mt-4 text-muted-foreground">Practical guides to intrusion prevention systems, signatures, and network defense. Use the lab to explore sample policy outcomes; all lab events are simulated.</p></header>
    <IpsDashboard />
    <IpsKnowledgeCenter />
    <section className="mt-10"><Link to="/threat-intel" className="surface block p-5"><h2 className="font-semibold">CVE Threat Intelligence</h2><p className="mt-2 text-sm text-muted-foreground">Review recent vulnerability disclosures and prioritize validation and patching.</p></Link></section>
  </main>;
}
