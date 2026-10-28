import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Terms of Service | SentinelGrid";
const DESCRIPTION =
  "Acceptable use, passive-collection limits and liability for the SentinelGrid OSINT platform.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/terms" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

const SECTIONS = [
  {
    h: "Acceptable use",
    p: "SentinelGrid performs passive reconnaissance against publicly published data only. You may not use it to harass individuals, to stage intrusive testing, or to aggregate personal data about private persons.",
  },
  {
    h: "No intrusive testing",
    p: "The platform issues no exploit traffic and no authenticated probing. Nothing in the service constitutes authorisation to test infrastructure you do not own.",
  },
  {
    h: "Accuracy",
    p: "Results are derived from third-party public sources and reflect what those sources published at query time. Verdicts are decision support, not a warranty about a target's security.",
  },
  {
    h: "Liability",
    p: "The service is provided as is. To the maximum extent permitted by law, our aggregate liability is limited to the fees paid in the twelve months preceding a claim.",
  },
];

function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="label-mono">Legal</p>
      <h1 className="mt-3 text-4xl font-bold">Terms of Service</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        By using SentinelGrid you agree to the terms below.
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
