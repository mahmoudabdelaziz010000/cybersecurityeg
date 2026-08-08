export interface Tier {
  id: string;
  name: string;
  price: string;
  cadence: string;
  pitch: string;
  cta: string;
  featured?: boolean;
  features: string[];
  limits: string;
}

export const TIERS: Tier[] = [
  {
    id: "recon",
    name: "Recon",
    price: "$0",
    cadence: "forever",
    pitch: "For individual analysts validating a single indicator.",
    cta: "Start scanning",
    limits: "25 scans / month · 1 seat",
    features: [
      "All 5 keyless OSINT connectors",
      "Phishing triage playbook",
      "JSON + CSV evidence export",
      "Community support",
    ],
  },
  {
    id: "team",
    name: "Team SOC",
    price: "$149",
    cadence: "per month",
    pitch: "For security teams running triage every day with an audit trail.",
    cta: "Start 14-day trial",
    featured: true,
    limits: "10,000 scans / month · 10 seats",
    features: [
      "Everything in Recon",
      "All automation playbooks + scheduling",
      "Bulk scanning up to 10 targets per run",
      "Webhook + REST API access",
      "Shared case history and evidence retention",
      "Priority email support, 8h response",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "annual",
    pitch: "For regulated organisations needing controls, SSO and guarantees.",
    cta: "Talk to sales",
    limits: "Unlimited scans · unlimited seats",
    features: [
      "Everything in Team SOC",
      "SSO/SAML, SCIM and role-based access",
      "Private connectors and premium keyed feeds",
      "SIEM/SOAR integrations and custom playbooks",
      "99.9% uptime SLA and dedicated success engineer",
      "DPA, data residency and audit logging",
    ],
  },
];

export interface AddOn {
  name: string;
  price: string;
  detail: string;
}

export const ADD_ONS: AddOn[] = [
  {
    name: "Scan credit packs",
    price: "$49 / 5,000 scans",
    detail: "Top up any plan when an incident spikes your volume. Credits never expire.",
  },
  {
    name: "Continuous attack-surface monitoring",
    price: "$8 / asset / month",
    detail: "Daily re-scan of your external assets with diff alerts on new ports, CVEs and subdomains.",
  },
  {
    name: "Managed triage retainer",
    price: "from $2,400 / month",
    detail: "Our analysts run your playbooks and hand you decisions, not alerts.",
  },
  {
    name: "White-label reporting",
    price: "$99 / month",
    detail: "Branded PDF exposure reports — resell assessments to your own clients.",
  },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "How is a scan counted?",
    a: "One scan is one target evaluated against the connectors you select, however many sources that involves. A three-step playbook against one domain counts as one scan.",
  },
  {
    q: "Do I need API keys to get started?",
    a: "No. Every connector shipped in the hub is keyless — Shodan InternetDB, RDAP, DNS over HTTPS, certificate transparency and HTTP header analysis all work with zero configuration. Keyed premium feeds are an Enterprise add-on.",
  },
  {
    q: "Is scanning third-party infrastructure legal?",
    a: "The platform only reads passive, publicly published data — registries, DNS, certificate transparency logs and public HTTP responses. It performs no intrusive testing, so no authorisation is required for passive reconnaissance.",
  },
  {
    q: "Can I cancel or change plans?",
    a: "Yes. Plans are month to month, prorated on upgrade, and cancellable at any time from billing settings. Annual contracts are available at a discount for Enterprise.",
  },
  {
    q: "Where is my scan data stored?",
    a: "Evidence is retained for the window in your plan and can be exported or purged on demand. Enterprise customers choose their data residency region.",
  },
];
