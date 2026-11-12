export type MonitoredDomain = {
  id: string;
  fqdn: string;
  verifiedAt: string | null;
  challengeExpiresAt: string;
  createdAt: string;
};

export type SurfaceEvidence = {
  source: "dns" | "certificate-transparency" | "rdap";
  observedAt: string;
  records: Record<string, string[]>;
};

export type CampaignMatch = {
  candidateDomain: string;
  relationship: "exact-domain" | "lookalike-candidate";
  reason: string;
  sources: {
    source: string;
    state: string;
    message: string;
    findings: import("./threat-enrichment").EnrichmentFinding[];
  }[];
};

export type DomainAssessment = {
  domain: string;
  surface: SurfaceEvidence[];
  campaignMatches: CampaignMatch[];
  assessedAt: string;
};
