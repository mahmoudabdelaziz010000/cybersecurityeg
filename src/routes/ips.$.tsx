import { createFileRoute, Link } from "@tanstack/react-router";
import { headLanguage, pageHead, SITE_URL } from "@/lib/seo";
import { getIpsArticle } from "@/lib/ips-content";
import { IpsDashboard, IpsKnowledgeCenter } from "@/components/ips-center-panels";

export const Route = createFileRoute("/ips/$")({
  head: (ctx) => {
    const article = getIpsArticle(ctx.params._splat?.split("/").filter(Boolean)[0]);
    if (!article) return { ...pageHead({ path: "/ips/", title: "IPS guide not found | SentinelGrid", description: "The requested IPS guide was not found.", lang: headLanguage(ctx) }) };
    const path = `/ips/${article.slug}/`;
    return { ...pageHead({ path, title: `${article.title} | SentinelGrid`, description: article.description, lang: headLanguage(ctx), type: "article" }), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, mainEntityOfPage: `${SITE_URL}${path}`, publisher: { "@type": "Organization", name: "SentinelGrid", url: SITE_URL } }) }] };
  },
  component: IpsArticlePage,
});

function IpsArticlePage() {
  const slug = Route.useParams()._splat?.split("/").filter(Boolean)[0];
  const article = getIpsArticle(slug);
  if (!article) return <main className="mx-auto max-w-4xl px-4 py-14"><h1 className="text-3xl font-bold">Guide not found</h1><Link to="/ips" className="mt-4 inline-block text-primary">Return to IPS Security Center</Link></main>;
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link to="/ips" className="hover:text-foreground">IPS Security Center</Link><span aria-hidden="true"> / </span><span>{article.title}</span></nav><article className="mt-6"><header className="mx-auto max-w-4xl"><p className="label-mono">IPS Knowledge Center</p><h1 className="mt-3 text-4xl font-bold">{article.title}</h1><p className="mt-4 text-lg text-muted-foreground">{article.intro}</p></header><IpsDashboard /><IpsKnowledgeCenter activeSlug={article.slug} /><div className="mx-auto max-w-4xl">{article.sections.map((section) => <section key={section.heading} className="mt-8"><h2 className="text-2xl font-semibold">{section.heading}</h2><p className="mt-3 leading-7 text-muted-foreground">{section.body}</p></section>)}<p className="mt-8"><Link to="/ips" className="text-primary hover:underline">← IPS Security Center</Link></p></div></article></main>;
}
