import { describe, expect, test } from "bun:test";
import { ipsStats } from "./ips-stats";
import type { IpsData, IpsSignature } from "./sophos-catalog";

const sig = (id: string, over: Partial<IpsSignature> = {}): IpsSignature => ({
  id, name: `Sig ${id}`, category: "Malware", severity: "High", platform: "Any", target: "Client", action: "Drop", policy: "P1", enabled: true, ...over,
});

const data: IpsData = {
  kind: "catalog",
  policies: [],
  signatures: [
    sig("1", { hits: [1, 2, 3] }),
    sig("2", { action: "Detect", severity: "Critical", category: "P2P", hits: [4, 0, 1] }),
    sig("3", { action: "Recommended", severity: "Low", enabled: false }),
  ],
  coverage: [
    { rule: "a", policy: "P1", from: "LAN", to: "WAN", action: "Accept", covered: true },
    { rule: "b", policy: "", from: "LAN", to: "DMZ", action: "Accept", covered: false },
    { rule: "c", policy: "P1", from: "WAN", to: "LAN", action: "Accept", covered: true },
  ],
};

describe("ipsStats", () => {
  test("splits blocking from detect-only and counts disabled", () => {
    const s = ipsStats(data);
    expect([s.total, s.blocking, s.detectOnly, s.disabled]).toEqual([3, 2, 1, 1]);
  });

  test("computes rule coverage and lists unprotected rules", () => {
    const s = ipsStats(data);
    expect([s.coveredRules, s.totalRules, s.coveragePercent]).toEqual([2, 3, 67]);
    expect(s.uncovered.map((c) => c.rule)).toEqual(["b"]);
  });

  test("returns null coverage when there are no rules", () => {
    expect(ipsStats({ ...data, coverage: [] }).coveragePercent).toBeNull();
  });

  test("counts severities and ranks categories", () => {
    const s = ipsStats(data);
    expect(s.severity).toEqual([{ level: "Critical", count: 1 }, { level: "High", count: 1 }, { level: "Medium", count: 0 }, { level: "Low", count: 1 }]);
    expect(s.categories[0]).toEqual({ name: "Malware", count: 2 });
  });

  test("sums hits per bucket and ranks signatures by total hits", () => {
    const s = ipsStats(data);
    expect(s.timeline).toEqual([5, 2, 4]);
    expect(s.topByHits.map((t) => [t.signature.id, t.total])).toEqual([["1", 6], ["2", 5]]);
  });

  test("has an empty timeline when the source has no hit counts", () => {
    const s = ipsStats({ ...data, signatures: [sig("9")] });
    expect(s.timeline).toEqual([]);
    expect(s.topByHits).toEqual([]);
  });
});
