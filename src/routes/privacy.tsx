import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Privacy Policy | SentinelGrid";
const DESCRIPTION =
  "How SentinelGrid collects, stores and retains scan data, account information and evidence exports.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacy" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

const SECTIONS = [
  {
    h: "What we collect",
    p: "Account details you provide (name, work email, organisation), the indicators you submit for scanning, and the results returned by public data sources. We do not collect the content of your internal systems.",
  },
  {
    h: "How scan data is used",
    p: "Submitted indicators are sent to the public sources you select in order to fulfil your request, and the normalised result is stored so you keep an evidence trail. We do not sell scan data or use it to build a resale intelligence product.",
  },
  {
    h: "Retention",
    p: "Free-tier results are retained for 7 days, Team SOC for 12 months, and Enterprise for the term agreed in contract. You can export or purge results at any time from your workspace.",
  },
  {
    h: "Third parties",
    p: "Scans transit to the public sources you enable — registry operators, DNS resolvers, certificate transparency aggregators and exposure databases. Those operators see the indicator you queried.",
  },
  {
    h: "Your rights",
    p: "You may request access, correction, export or deletion of your personal data at any time. Enterprise customers can additionally select a data residency region.",
  },
];

function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="label-mono">Legal</p>
      <h1 className="mt-3 text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        This policy explains what SentinelGrid stores when you run a scan and how long we keep it.
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-xl font-semibold">{s.h}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
