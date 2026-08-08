import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scanTarget, type HubResult } from "./osint.functions";

export interface PlaybookStep {
  id: string;
  title: string;
  sources: string[];
  description: string;
}

export interface Playbook {
  slug: string;
  name: string;
  outcome: string;
  trigger: string;
  sla: string;
  tier: "Free" | "Team" | "Enterprise";
  steps: PlaybookStep[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    slug: "phishing-triage",
    name: "Phishing domain triage",
    outcome: "Decide block / allow on a reported domain in under a minute.",
    trigger: "Abuse mailbox report or SOAR webhook",
    sla: "60s",
    tier: "Free",
    steps: [
      { id: "registry", title: "Registry & age check", sources: ["rdap"], description: "Freshly registered domains carry most phishing risk." },
      { id: "mail", title: "Mail & DNS posture", sources: ["dns"], description: "Resolve MX and SPF to see if the domain can spoof mail." },
      { id: "footprint", title: "Certificate footprint", sources: ["crtsh"], description: "Enumerate lookalike hostnames from CT logs." },
    ],
  },
  {
    slug: "external-asset-review",
    name: "External asset exposure review",
    outcome: "Inventory internet-facing surface and unpatched CVEs for an IP.",
    trigger: "Weekly schedule or new asset onboarding",
    sla: "5m",
    tier: "Team",
    steps: [
      { id: "surface", title: "Port & CVE sweep", sources: ["shodan_internetdb"], description: "Open ports, service fingerprints and known vulnerabilities." },
      { id: "owner", title: "Ownership attribution", sources: ["rdap"], description: "Map the netblock to an owner for accountable remediation." },
    ],
  },
  {
    slug: "vendor-due-diligence",
    name: "Vendor due diligence",
    outcome: "Score a third party's public security hygiene before signature.",
    trigger: "Procurement intake form",
    sla: "10m",
    tier: "Team",
    steps: [
      { id: "web", title: "Web hardening audit", sources: ["headers"], description: "HSTS, CSP and clickjacking protections on the primary site." },
      { id: "dns", title: "Email spoofing risk", sources: ["dns"], description: "SPF presence and mail routing." },
      { id: "surface", title: "Public footprint", sources: ["crtsh", "rdap"], description: "Shadow IT and subdomain sprawl." },
    ],
  },
  {
    slug: "incident-enrichment",
    name: "Incident IOC enrichment",
    outcome: "Attach registry, exposure and infrastructure context to every alert IOC.",
    trigger: "SIEM alert with an indicator",
    sla: "30s",
    tier: "Enterprise",
    steps: [
      { id: "all-ip", title: "Full-spectrum sweep", sources: ["shodan_internetdb", "rdap"], description: "Everything known about the indicator, concurrently." },
      { id: "all-domain", title: "Domain pivot", sources: ["dns", "crtsh", "headers"], description: "Pivot from infrastructure to related hostnames." },
    ],
  },
];

export interface StepRun {
  id: string;
  title: string;
  status: "ok" | "partial" | "failed";
  findings: string[];
  facts: { key: string; value: string }[];
}

export interface WorkflowRun {
  playbook: string;
  target: string;
  verdict: HubResult["verdict"];
  score: number;
  steps: StepRun[];
  recommendation: string;
  finishedAt: string;
}

function recommend(verdict: HubResult["verdict"]): string {
  switch (verdict) {
    case "malicious":
      return "Block at the perimeter and open a P2 incident. Evidence is attached to every step below.";
    case "caution":
      return "Escalate to an analyst for manual review — signals are mixed but not conclusive.";
    case "clean":
      return "No blocking signals found. Close the ticket and keep the evidence trail for audit.";
    default:
      return "No source could answer for this target. Re-run with a different indicator type.";
  }
}

export const runPlaybook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string(), target: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }): Promise<WorkflowRun> => {
    const playbook = PLAYBOOKS.find((p) => p.slug === data.slug);
    if (!playbook) throw new Error("Unknown playbook");

    const steps: StepRun[] = [];
    let score = 0;
    let verdict: HubResult["verdict"] = "unknown";

    for (const step of playbook.steps) {
      const result = await scanTarget(data.target, step.sources);
      const answered = result.sources.filter((s) => s.ok);
      if (answered.length) {
        score = Math.max(score, result.score);
        verdict = result.verdict;
      }
      if (!answered.length && step.sources.length) {
        steps.push({ id: step.id, title: step.title, status: "failed", findings: ["No source in this step supports the target type."], facts: [] });
        continue;
      }
      steps.push({
        id: step.id,
        title: step.title,
        status: answered.length === result.sources.length ? "ok" : "partial",
        findings: result.headline.length ? result.headline : ["No adverse signals from this step."],
        facts: answered.flatMap((s) => s.facts.map((f) => ({ key: `${s.label} · ${f.key}`, value: f.value }))),
      });
    }

    const finalVerdict: HubResult["verdict"] =
      score >= 60 ? "malicious" : score >= 25 ? "caution" : verdict === "unknown" ? "unknown" : "clean";

    return {
      playbook: playbook.name,
      target: data.target,
      verdict: finalVerdict,
      score,
      steps,
      recommendation: recommend(finalVerdict),
      finishedAt: new Date().toISOString(),
    };
  });
