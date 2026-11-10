import { Link } from "@tanstack/react-router";
import { IPS_ARTICLES } from "@/lib/ips-content";
import { IpsLab } from "@/components/ips-lab";

export function IpsDashboard() {
  return (
    <section id="ips-dashboard" aria-labelledby="ips-dashboard-title" className="surface-raised mt-10 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono">IPS Security Center</p>
          <h2 id="ips-dashboard-title" className="mt-2 text-2xl font-bold">Interactive IPS Dashboard</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Explore policy outcomes in a local simulation. This dashboard has no firewall connection and shows no live telemetry.</p>
        </div>
        <span className="rounded-full border border-caution/40 bg-caution/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-caution">Simulation only</span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="surface p-4"><p className="label-mono">Telemetry</p><p className="mt-2 text-lg font-semibold">Not connected</p><p className="mt-1 text-xs text-muted-foreground">No real firewall data</p></div>
        <div className="surface p-4"><p className="label-mono">Scenarios</p><p className="mt-2 text-lg font-semibold">3 simulations</p><p className="mt-1 text-xs text-muted-foreground">Scan, brute force, SQL injection</p></div>
        <div className="surface p-4"><p className="label-mono">Knowledge Center</p><p className="mt-2 text-lg font-semibold">{IPS_ARTICLES.length} guides</p><p className="mt-1 text-xs text-muted-foreground">Detection, products, signatures, CVEs</p></div>
      </div>
      <a href="#ips-lab" className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open interactive lab</a>
      <IpsLab />
    </section>
  );
}

export function IpsKnowledgeCenter({ activeSlug }: { activeSlug?: string }) {
  return (
    <section id="ips-knowledge-center" aria-labelledby="ips-knowledge-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="label-mono">Browse all topics</p><h2 id="ips-knowledge-title" className="mt-2 text-2xl font-semibold">IPS Knowledge Center</h2></div>
        <span className="font-mono text-xs text-muted-foreground">{IPS_ARTICLES.length} guides</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {IPS_ARTICLES.map((article) => {
          const active = article.slug === activeSlug;
          return (
            <article key={article.slug} className={`surface p-5 ${active ? "border-primary/60" : ""}`}>
              <h3 className="font-semibold">{article.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{article.description}</p>
              <Link to="/ips/$" params={{ _splat: `${article.slug}/` }} aria-current={active ? "page" : undefined} className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
                {active ? "Current guide" : "Read guide"} <span className="ms-1" aria-hidden="true">→</span>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
