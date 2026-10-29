import { createFileRoute, Link } from "@tanstack/react-router";
import { Facebook, ShieldCheck, TriangleAlert } from "lucide-react";
import { FACEBOOK_PAGE_URL, SITE_URL as SITE, facebookShareUrl, ogImageMeta } from "@/lib/seo";

const TITLE = "Web Reconnaissance Guide for Kali Linux | SentinelGrid";
const DESCRIPTION =
  "A 10-step web reconnaissance guide for Kali Linux: passive OSINT, subdomain enumeration, live hosts, hidden paths and reporting. Authorized testing only.";

interface Step {
  title: string;
  summary: string;
  code: string;
}

const STEPS: Step[] = [
  {
    title: "Set up a lab environment",
    summary:
      "Use a Kali Linux VM and a legal target: your own website or a deliberately vulnerable app such as DVWA or OWASP Juice Shop.",
    code: `sudo apt update && sudo apt upgrade -y
sudo apt install -y recon-ng theharvester amass subfinder assetfinder whatweb curl wget nmap dirb gobuster nikto

# Local practice target
docker run --rm -p 3000:3000 bkimminich/juice-shop`,
  },
  {
    title: "Passive reconnaissance (OSINT)",
    summary: "Collect public information without touching the target directly.",
    code: `whois example.com
dig example.com any
theHarvester -d example.com -b all -l 200`,
  },
  {
    title: "Subdomain enumeration",
    summary: "Run several tools, then merge the results and remove duplicates.",
    code: `subfinder -d example.com -o subfinder.txt
amass enum -d example.com -o amass.txt
assetfinder --subs-only example.com > asset.txt
cat subfinder.txt amass.txt asset.txt | sort -u > all_subdomains.txt`,
  },
  {
    title: "Filter for live subdomains",
    summary: "Keep only hosts that respond, with status code, title and technology.",
    code: `cat all_subdomains.txt | httpx -silent -status-code -title -tech-detect -o live_subdomains.txt`,
  },
  {
    title: "Discover hidden directories and files",
    summary: "Look for admin panels, backups and forgotten paths on systems you are authorized to test.",
    code: `gobuster dir -u https://example.com -w /usr/share/wordlists/dirb/common.txt -o gobuster.txt
dirb https://example.com /usr/share/wordlists/dirb/common.txt -o dirb.txt`,
  },
  {
    title: "Technology detection",
    summary: "Identify the server, framework and third-party components in use.",
    code: `whatweb https://example.com`,
  },
  {
    title: "Basic vulnerability scanning",
    summary: "Scan for common misconfigurations. Authorized targets only, and verify every finding manually.",
    code: `nikto -h https://example.com`,
  },
  {
    title: "Parameter and API analysis",
    summary: "Collect known URLs and parameters to see which endpoints deserve a closer look in your lab.",
    code: `cat live_subdomains.txt | gau | tee urls.txt
cat urls.txt | uro | tee endpoints.txt
cat urls.txt | grep "?" | tee params.txt`,
  },
  {
    title: "Visual mapping with recon-ng",
    summary: "Organize what you gathered into a workspace so relationships between hosts are easy to see.",
    code: `recon-ng
[recon-ng][default] > workspace create example
[recon-ng][example] > modules load recon/domains-hosts/brute_hosts
[recon-ng][example] > set source example.com
[recon-ng][example] > run
[recon-ng][example] > show hosts`,
  },
  {
    title: "Analyze and write the report",
    summary: "Findings only help once they are written down clearly.",
    code: `Target information
Subdomains found
Live hosts
Technologies used
Interesting directories and files
Potential security risks
Screenshots / evidence
Recommendations`,
  },
];

export const Route = createFileRoute("/recon-guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE}/recon-guide` },
      ...ogImageMeta("recon-guide", "Web reconnaissance on Kali Linux: a 10-step guide from SentinelGrid"),
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE}/recon-guide` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Advanced web reconnaissance on Kali Linux",
          description: DESCRIPTION,
          step: STEPS.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.summary,
          })),
        }),
      },
    ],
  }),
  component: ReconGuide,
});

function ReconGuide() {
  const shareUrl = facebookShareUrl("/recon-guide", "recon_guide");

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header>
        <p className="label-mono">Guide</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Advanced web reconnaissance</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          A ten-step workflow on Kali Linux for finding assets, identifying technologies, mapping the
          attack surface and writing it up. The goal is to understand exposure so you can reduce it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/osint"
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Run a free passive scan
          </Link>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent"
          >
            <Facebook className="size-4" aria-hidden="true" /> Follow us on Facebook
          </a>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent"
          >
            Share this guide
          </a>
        </div>
      </header>

      <aside className="surface mt-10 flex gap-3 p-5" role="note">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-caution" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold">Authorized testing only</p>
          <p className="mt-1 text-muted-foreground">
            Only test websites you own or have written permission to test. Active steps such as
            directory brute-forcing and vulnerability scanning can disrupt services and may be illegal
            without authorization. Tools produce false positives, so verify findings manually.
          </p>
        </div>
      </aside>

      <ol className="mt-10 space-y-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="surface p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="font-display text-xl font-semibold">{s.title}</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.summary}</p>
            <pre
              dir="ltr"
              className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-relaxed"
            >
              <code>{s.code}</code>
            </pre>
          </li>
        ))}
      </ol>

      <section className="surface mt-10 flex gap-3 p-6">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-display text-lg font-semibold">Skip the setup for passive checks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The OSINT hub runs registry, DNS, certificate-transparency, exposure and header checks in
            one step, with no keys and no install.
          </p>
          <Link to="/osint" className="mt-3 inline-block text-sm text-primary hover:underline">
            Open the OSINT hub
          </Link>
        </div>
      </section>
    </div>
  );
}
