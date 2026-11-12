import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { checkCampaignFeeds } from "./threat-enrichment.server";
import type { CampaignMatch, SurfaceEvidence } from "./attack-surface";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_SUBDOMAINS = 100;
const MAX_LOOKALIKE_CANDIDATES = 6;
const MAX_ASSESSMENTS_PER_HOUR = 5;
const assessmentStarts = new Map<string, number[]>();

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeOwnedDomain(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/\.$/, "");
  if (
    !value ||
    value.length > 253 ||
    value.includes("://") ||
    value.includes("/") ||
    /[?#@:*\s]/.test(value)
  ) {
    throw new Error(
      "Enter a plain fully qualified domain name, without a URL, path, wildcard, or IP address.",
    );
  }
  if (!/^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i.test(value)) {
    throw new Error("Enter a valid public domain name.");
  }
  if (
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) ||
    value.endsWith(".localhost") ||
    value.endsWith(".local")
  ) {
    throw new Error("IP addresses and local-only names cannot be monitored.");
  }
  return value;
}

function randomChallenge(): string {
  return `sentinelgrid-verification=${randomBytes(24).toString("hex")}`;
}

function unquoteTxt(value: string): string {
  return value.replace(/^"|"$/g, "").replace(/\\(["\\])/g, "$1");
}

async function dnsAnswers(name: string, type: string): Promise<string[]> {
  const url = new URL("https://dns.google/resolve");
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: "application/dns-json" },
  });
  if (!response.ok) throw new Error(`DNS lookup failed (${response.status}).`);
  const data = (await response.json()) as { Answer?: { data?: string }[] };
  return (data.Answer ?? [])
    .flatMap((answer) =>
      typeof answer.data === "string" ? [unquoteTxt(answer.data).slice(0, 250)] : [],
    )
    .slice(0, 40);
}

export async function registerMonitoredDomain(userId: string, rawDomain: string) {
  const fqdn = normalizeOwnedDomain(rawDomain);
  const { data: existing, error: readError } = await supabaseAdmin
    .from("monitored_domains")
    .select("id, verified_at")
    .eq("user_id", userId)
    .eq("fqdn", fqdn)
    .maybeSingle();
  if (readError) throw new Error("Could not access monitored domains.");
  if (existing?.verified_at) throw new Error("This domain is already verified on your account.");
  if (!existing) {
    const [{ data: profile }, { count, error: countError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("plan_id").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("monitored_domains").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    if (countError) throw new Error("Could not check your monitored-domain allowance.");
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("name, max_monitored_domains")
      .eq("id", profile?.plan_id ?? "recon")
      .maybeSingle();
    if (planError) throw new Error("Could not load your subscription allowance.");
    const allowance = plan?.max_monitored_domains ?? null;
    if (allowance !== null && (count ?? 0) >= allowance) {
      throw new Error(
        `${plan?.name ?? "Your current plan"} includes ${allowance} monitored domain${allowance === 1 ? "" : "s"}. Upgrade your plan to monitor more.`,
      );
    }
  }
  const challenge = randomChallenge();
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const values = {
    user_id: userId,
    fqdn,
    challenge_hash: sha256(challenge),
    challenge_expires_at: expiresAt,
    verified_at: null,
  };
  const { data, error } = existing
    ? await supabaseAdmin
        .from("monitored_domains")
        .update(values)
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("id")
        .single()
    : await supabaseAdmin.from("monitored_domains").insert(values).select("id").single();
  if (error || !data) throw new Error("Could not register this domain. Please try again.");
  return {
    id: data.id,
    fqdn,
    challenge,
    recordName: `_sentinelgrid-verification.${fqdn}`,
    expiresAt,
  };
}

export async function verifyMonitoredDomain(userId: string, domainId: string) {
  const { data: domain, error } = await supabaseAdmin
    .from("monitored_domains")
    .select("id, fqdn, challenge_hash, challenge_expires_at, verified_at")
    .eq("id", domainId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !domain) throw new Error("Monitored domain not found.");
  if (domain.verified_at)
    return { id: domain.id, fqdn: domain.fqdn, verifiedAt: domain.verified_at };
  if (Date.parse(domain.challenge_expires_at) <= Date.now())
    throw new Error("The DNS challenge expired. Request a new verification record.");
  const values = await dnsAnswers(`_sentinelgrid-verification.${domain.fqdn}`, "TXT");
  if (!values.some((value) => sha256(value) === domain.challenge_hash))
    throw new Error(
      "DNS verification record was not found yet. DNS changes can take a few minutes to appear.",
    );
  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("monitored_domains")
    .update({ verified_at: verifiedAt })
    .eq("id", domain.id)
    .eq("user_id", userId);
  if (updateError) throw new Error("Could not save domain verification.");
  return { id: domain.id, fqdn: domain.fqdn, verifiedAt };
}

export async function listMonitoredDomains(userId: string) {
  const [{ data, error }, { data: profile }, { count, error: countError }] = await Promise.all([
    supabaseAdmin
    .from("monitored_domains")
    .select("id, fqdn, verified_at, challenge_expires_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1000),
    supabaseAdmin.from("profiles").select("plan_id").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("monitored_domains").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (error) throw new Error("Could not load monitored domains.");
  if (countError) throw new Error("Could not load monitored-domain usage.");
  const { data: plan, error: planError } = await supabaseAdmin
    .from("plans")
    .select("name, max_monitored_domains")
    .eq("id", profile?.plan_id ?? "recon")
    .maybeSingle();
  if (planError) throw new Error("Could not load your subscription allowance.");
  return { domains: (data ?? []).map((row) => ({
    id: row.id,
    fqdn: row.fqdn,
    verifiedAt: row.verified_at,
    challengeExpiresAt: row.challenge_expires_at,
    createdAt: row.created_at,
  })), usage: { planName: plan?.name ?? "Recon", used: count ?? 0, limit: plan?.max_monitored_domains ?? null } };
}

export async function removeMonitoredDomain(userId: string, domainId: string) {
  const { error } = await supabaseAdmin
    .from("monitored_domains")
    .delete()
    .eq("id", domainId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not remove monitored domain.");
  return { removed: true };
}

async function collectSurface(fqdn: string): Promise<SurfaceEvidence[]> {
  const observedAt = new Date().toISOString();
  const [a, aaaa, mx, ns, txt, certificates, rdap] = await Promise.allSettled([
    dnsAnswers(fqdn, "A"),
    dnsAnswers(fqdn, "AAAA"),
    dnsAnswers(fqdn, "MX"),
    dnsAnswers(fqdn, "NS"),
    dnsAnswers(fqdn, "TXT"),
    (async () => {
      const url = new URL("https://crt.sh/");
      url.searchParams.set("q", `%.${fqdn}`);
      url.searchParams.set("output", "json");
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Certificate source failed (${response.status}).`);
      return (await response.json()) as { name_value?: string }[];
    })(),
    (async () => {
      const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(fqdn)}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { accept: "application/rdap+json, application/json" },
      });
      if (!response.ok) throw new Error(`Registration source failed (${response.status}).`);
      return (await response.json()) as {
        ldhName?: string;
        status?: string[];
        events?: { eventAction?: string; eventDate?: string }[];
      };
    })(),
  ]);
  const answers = (item: PromiseSettledResult<string[]>) =>
    item.status === "fulfilled" ? item.value : [];
  const certRows = certificates.status === "fulfilled" ? certificates.value : [];
  const subdomains = [
    ...new Set(
      certRows.flatMap((row) =>
        (row.name_value ?? "")
          .split(/[\r\n, ]+/)
          .map((name) => name.toLowerCase().replace(/^\*\./, "").replace(/\.$/, ""))
          .filter((name) => name === fqdn || name.endsWith(`.${fqdn}`)),
      ),
    ),
  ].slice(0, MAX_SUBDOMAINS);
  const rdapData = rdap.status === "fulfilled" ? rdap.value : null;
  const registration = rdapData?.events?.find(
    (event) => event.eventAction === "registration",
  )?.eventDate;
  return [
    {
      source: "dns",
      observedAt,
      records: {
        A: answers(a),
        AAAA: answers(aaaa),
        MX: answers(mx),
        NS: answers(ns),
        TXT: answers(txt),
      },
    },
    { source: "certificate-transparency", observedAt, records: { subdomains } },
    {
      source: "rdap",
      observedAt,
      records: {
        name: rdapData?.ldhName ? [rdapData.ldhName] : [],
        status: rdapData?.status ?? [],
        registeredAt: registration ? [registration] : [],
        unavailable: rdap.status === "rejected" ? ["Registration data unavailable"] : [],
      },
    },
  ];
}

export function lookalikeCandidates(fqdn: string): string[] {
  const labels = fqdn.split(".");
  if (labels.length < 2) return [];
  const compoundSuffixes = new Set([
    "co.uk",
    "org.uk",
    "com.au",
    "net.au",
    "co.jp",
    "co.nz",
    "com.br",
    "com.sg",
    "com.mx",
  ]);
  const suffix = labels.slice(-2).join(".");
  const suffixLabels = compoundSuffixes.has(suffix) && labels.length >= 3 ? 2 : 1;
  const brandIndex = labels.length - suffixLabels - 1;
  if (brandIndex < 0) return [];
  const brand = labels[brandIndex]!;
  const baseTld = labels.at(-1)!;
  const domainStem = labels.slice(brandIndex).join(".");
  const candidates = [
    `${brand}-login.${baseTld}`,
    `secure-${domainStem}.${baseTld}`,
    `${domainStem}-support.${baseTld}`,
    `${brand.replace(/o/g, "0")}.${baseTld}`,
    ...["net", "org", "co", "com"]
      .filter((tld) => tld !== baseTld)
      .map((tld) => `${domainStem}.${tld}`),
  ];
  return [...new Set(candidates)]
    .filter((item) => item !== fqdn && /^[a-z\d-]+(?:\.[a-z\d-]+)+$/.test(item))
    .slice(0, MAX_LOOKALIKE_CANDIDATES);
}

export async function runDomainAssessment(userId: string, domainId: string) {
  const now = Date.now();
  const recent = (assessmentStarts.get(userId) ?? []).filter(
    (startedAt) => now - startedAt < 60 * 60_000,
  );
  if (recent.length >= MAX_ASSESSMENTS_PER_HOUR)
    throw new Error("Assessment limit reached. Try again later.");
  recent.push(now);
  assessmentStarts.set(userId, recent);
  const { data: domain, error } = await supabaseAdmin
    .from("monitored_domains")
    .select("id, fqdn, verified_at")
    .eq("id", domainId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !domain) throw new Error("Monitored domain not found.");
  if (!domain.verified_at)
    throw new Error("Verify domain ownership before starting an assessment.");
  const surface = await collectSurface(domain.fqdn);
  const candidates = [domain.fqdn, ...lookalikeCandidates(domain.fqdn)];
  const campaignMatches: CampaignMatch[] = [];
  for (const candidate of candidates) {
    const sources = await checkCampaignFeeds(candidate);
    const findings = sources.some((source) => source.findings.length > 0);
    if (findings)
      campaignMatches.push({
        candidateDomain: candidate,
        relationship: candidate === domain.fqdn ? "exact-domain" : "lookalike-candidate",
        reason:
          candidate === domain.fqdn
            ? "Exact match to the verified domain."
            : "Generated brand-name variant matched a public campaign source; review before attributing ownership or intent.",
        sources: sources.map(({ source, state, message, findings: items }) => ({
          source,
          state,
          message: message.slice(0, 200),
          findings: items
            .slice(0, 10)
            .map((item) => ({
              ...item,
              title: item.title.slice(0, 160),
              detail: item.detail.slice(0, 500),
            })),
        })),
      });
  }
  const { error: saveError } = await supabaseAdmin.from("domain_assessment_runs").insert({
    user_id: userId,
    monitored_domain_id: domain.id,
    surface: JSON.parse(JSON.stringify(surface)) as Json,
    campaign_matches: JSON.parse(JSON.stringify(campaignMatches)) as Json,
  });
  if (saveError) throw new Error("Assessment completed but could not be saved to history.");
  return { domain: domain.fqdn, surface, campaignMatches, assessedAt: new Date().toISOString() };
}
