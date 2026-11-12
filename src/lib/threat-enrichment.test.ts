import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deduplicateFindings, normalizeEnrichment, normalizeIndicator, scoreIndicator, type EnrichmentFinding, type SourceResult } from "./threat-enrichment.ts";

describe("threat indicator normalization", () => {
  it("classifies IPs, domains, URLs, and supported file hash lengths", () => {
    assert.deepEqual(normalizeIndicator(" 203.0.113.25 "), { indicator: "203.0.113.25", type: "ip" });
    assert.deepEqual(normalizeIndicator("[2001:db8::1]"), { indicator: "2001:db8::1", type: "ip" });
    assert.deepEqual(normalizeIndicator("Example.COM."), { indicator: "example.com", type: "domain" });
    assert.deepEqual(normalizeIndicator("https://Example.com/path#fragment"), { indicator: "https://example.com/path", type: "url" });
    assert.deepEqual(normalizeIndicator("A".repeat(64)), { indicator: "a".repeat(64), type: "hash" });
    assert.equal(normalizeIndicator("a".repeat(40)).type, "hash");
    assert.equal(normalizeIndicator("a".repeat(32)).type, "hash");
  });

  it("rejects unsupported values and URLs with embedded credentials", () => {
    assert.throws(() => normalizeIndicator("not a domain"));
    assert.throws(() => normalizeIndicator("::::"), /Invalid IP address/);
    assert.throws(() => normalizeIndicator("https://user:pass@example.com/secret"), /credentials/);
    assert.throws(() => normalizeIndicator(""), /Enter an indicator/);
  });
});

const sample: EnrichmentFinding = { id: "42", source: "ThreatFox", title: "C2", detail: "botnet", observedAt: "2026-11-12T00:00:00Z", reference: null, confidence: 80 };
const source = (name: SourceResult["source"], state: SourceResult["state"], findings: EnrichmentFinding[] = []): SourceResult => ({ source: name, state, message: "", checkedAt: "2026-11-12T00:00:00Z", findings });

describe("threat enrichment aggregation", () => {
  it("deduplicates repeated source evidence while preserving independent source attribution", () => {
    const duplicate = { ...sample };
    assert.equal(deduplicateFindings([sample, duplicate]).length, 1);
    assert.equal(deduplicateFindings([sample, { ...sample, source: "URLhaus" }]).length, 2);
  });

  it("scores positive evidence transparently and never treats empty coverage as clean", () => {
    const matched = source("ThreatFox", "matched", [sample]);
    const noMatch = source("URLhaus", "no-match");
    assert.deepEqual({ score: scoreIndicator([matched, noMatch]).score, severity: scoreIndicator([matched, noMatch]).severity }, { score: 79, severity: "high" });
    assert.deepEqual({ score: scoreIndicator([noMatch]).score, severity: scoreIndicator([noMatch]).severity }, { score: 0, severity: "unknown" });
    assert.equal(scoreIndicator([source("ThreatFox", "unavailable")]).severity, "unknown");
  });

  it("builds a normalized result with source evidence and timestamps", () => {
    const result = normalizeEnrichment({ indicator: "example.com", type: "domain", sources: [source("ThreatFox", "matched", [sample])], enrichedAt: "2026-11-12T10:00:00Z" });
    assert.equal(result.findings.length, 1);
    assert.equal(result.sources[0]?.source, "ThreatFox");
    assert.equal(result.enrichedAt, "2026-11-12T10:00:00Z");
    assert.match(result.rationale.join(" "), /distinct positive finding/);
  });
});

