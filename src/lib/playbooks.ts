import type { Verdict } from "./osint-catalog";

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
  accepts: string;
  steps: PlaybookStep[];
}

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
  verdict: Verdict;
  score: number;
  steps: StepRun[];
  recommendation: string;
  finishedAt: string;
}

export const PLAYBOOKS: Playbook[] = [
  {
    slug: "phishing-triage",
    name: "Phishing domain triage",
    outcome: "Decide block or allow on a reported domain in under a minute.",
    trigger: "Abuse mailbox report or SOAR webhook",
    sla: "60s",
    tier: "Free",
    accepts: "domain",
    steps: [
      {
        id: "registry",
        title: "Registry & age check",
        sources: ["rdap"],
        description: "Freshly registered domains carry the majority of phishing risk.",
      },
      {
        id: "mail",
        title: "Mail & DNS posture",
        sources: ["dns"],
        description: "Resolve MX and SPF to see whether the domain can spoof mail.",
      },
      {
        id: "footprint",
        title: "Certificate footprint",
        sources: ["crtsh"],
        description: "Enumerate lookalike hostnames from certificate transparency logs.",
      },
    ],
  },
  {
    slug: "external-asset-review",
    name: "External asset exposure review",
    outcome: "Inventory internet-facing surface and unpatched CVEs for an IP.",
    trigger: "Weekly schedule or new asset onboarding",
    sla: "5m",
    tier: "Team",
    accepts: "IP address",
    steps: [
      {
        id: "surface",
        title: "Port & CVE sweep",
        sources: ["shodan_internetdb"],
        description: "Open ports, service fingerprints and known vulnerabilities.",
      },
      {
        id: "owner",
        title: "Ownership attribution",
        sources: ["rdap"],
        description: "Map the netblock to an owner so remediation has an accountable party.",
      },
    ],
  },
  {
    slug: "vendor-due-diligence",
    name: "Vendor due diligence",
    outcome: "Score a third party's public security hygiene before signature.",
    trigger: "Procurement intake form",
    sla: "10m",
    tier: "Team",
    accepts: "domain",
    steps: [
      {
        id: "web",
        title: "Web hardening audit",
        sources: ["headers"],
        description: "HSTS, CSP and clickjacking protections on the primary site.",
      },
      {
        id: "dns",
        title: "Email spoofing risk",
        sources: ["dns"],
        description: "SPF presence and mail routing for the vendor's domain.",
      },
      {
        id: "surface",
        title: "Public footprint",
        sources: ["crtsh", "rdap"],
        description: "Shadow IT, subdomain sprawl and registration history.",
      },
    ],
  },
  {
    slug: "incident-enrichment",
    name: "Incident IOC enrichment",
    outcome: "Attach registry, exposure and infrastructure context to every alert indicator.",
    trigger: "SIEM alert containing an indicator",
    sla: "30s",
    tier: "Enterprise",
    accepts: "IP or domain",
    steps: [
      {
        id: "sweep",
        title: "Full-spectrum sweep",
        sources: ["shodan_internetdb", "rdap", "dns"],
        description: "Everything known about the indicator, queried concurrently.",
      },
      {
        id: "pivot",
        title: "Infrastructure pivot",
        sources: ["crtsh", "headers"],
        description: "Pivot from the indicator to related hostnames and live services.",
      },
    ],
  },
];
