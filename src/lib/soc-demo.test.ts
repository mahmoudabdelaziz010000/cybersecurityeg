import { describe, expect, test } from "bun:test";
import { EVENTS, GROUPS, PROVIDERS } from "./xdr-demo";
import { FLEET, THREAT_TREND_14D, fleetOnlinePercent, groupCoverage, openBySeverity, socMetrics, tacticBreakdown, topAssets } from "./soc-demo";

describe("SOC dashboard fixtures", () => {
  test("fleet states add up to the total", () => {
    expect(FLEET.online + FLEET.offline + FLEET.outdated).toBe(FLEET.total);
    expect(fleetOnlinePercent()).toBe(94);
  });
  test("14-day trend never mitigates more than it detects", () => {
    expect(THREAT_TREND_14D).toHaveLength(14);
    expect(THREAT_TREND_14D.every((day) => day.mitigated <= day.detected)).toBe(true);
  });
  test("metrics agree with the open/resolved events", () => {
    const metrics = socMetrics(EVENTS);
    expect(metrics.active).toBe(EVENTS.filter((e) => e.status === "Open").length);
    expect(metrics.mitigated).toBe(EVENTS.filter((e) => e.status === "Resolved").length);
    expect(metrics.critical).toBe(3);
  });
  test("severity breakdown lists every severity and sums to the open threats", () => {
    const rows = openBySeverity(EVENTS);
    expect(rows.map((r) => r.severity)).toEqual(["Critical", "High", "Medium", "Low", "Info"]);
    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(socMetrics(EVENTS).active);
  });
  test("tactics are sorted by frequency then name", () => {
    const rows = tacticBreakdown(EVENTS);
    for (let i = 1; i < rows.length; i += 1) expect(rows[i - 1]!.count).toBeGreaterThanOrEqual(rows[i]!.count);
    expect(rows.find((r) => r.tactic === "Command and Control")?.count).toBe(2);
  });
  test("top assets only count open threats", () => {
    const assets = topAssets(EVENTS, 3);
    expect(assets).toHaveLength(3);
    expect(assets.every((a) => a.count >= 1)).toBe(true);
    expect(topAssets(EVENTS.filter((e) => e.status !== "Open"))).toEqual([]);
  });
  test("coverage lists every provider group", () => {
    const coverage = groupCoverage();
    expect(coverage.map((c) => c.group).sort()).toEqual([...GROUPS].sort());
    expect(coverage.reduce((sum, c) => sum + c.providers, 0)).toBe(PROVIDERS.length);
  });
});
