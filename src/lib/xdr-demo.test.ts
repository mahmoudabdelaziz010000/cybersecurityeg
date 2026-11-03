import { describe, expect, test } from "bun:test";
import { EVENTS, GROUPS, PROVIDERS, collectionMethods, filterEvents, telemetryMetrics } from "./xdr-demo";

describe("XDR prototype boundaries", () => {
  test("demo events never count as genuinely connected sources", () => {
    expect(telemetryMetrics(EVENTS).connected).toBe(0);
    expect(telemetryMetrics(EVENTS).ingested).toBe(18);
  });
  test("severity and source filters intersect with search", () => {
    expect(filterEvents(EVENTS, "PowerShell", "Critical", "defender").map((e) => e.id)).toEqual(["DEMO-001"]);
    expect(filterEvents(EVENTS, "PowerShell", "Low", "defender")).toHaveLength(0);
  });
  test("each demo event belongs to an explicitly demo provider", () => {
    expect(EVENTS.every((event) => PROVIDERS.find((provider) => provider.id === event.source)?.demo === true)).toBe(true);
  });
  test("shorter time window excludes older fixture events", () => {
    expect(filterEvents(EVENTS, "", "all", "all", 2)).toHaveLength(5);
  });
  test("catalog covers firewalls, Kaspersky Security Center and Windows servers", () => {
    const byId = (id: string) => PROVIDERS.find((provider) => provider.id === id);
    expect(byId("ksc")?.group).toBe("Endpoints");
    expect(byId("windows")?.group).toBe("Servers");
    expect(PROVIDERS.filter((p) => p.group === "Firewalls").length).toBeGreaterThanOrEqual(4);
    expect(new Set(PROVIDERS.map((p) => p.id)).size).toBe(PROVIDERS.length);
  });
  test("every provider group has providers and every provider offers a collection method", () => {
    for (const group of GROUPS) expect(PROVIDERS.some((p) => p.group === group)).toBe(true);
    for (const provider of PROVIDERS) {
      expect(collectionMethods(provider).length).toBeGreaterThan(0);
      expect(provider.fields.length).toBe(3);
      expect(provider.fields.every((field) => field[0] && field[1])).toBe(true);
    }
    expect(collectionMethods(PROVIDERS.find((p) => p.id === "windows")!).map((m) => m.id)).toContain("wef");
  });
  test("only sample providers have events; new setup-only providers stay unconnected", () => {
    expect(telemetryMetrics(EVENTS).connected).toBe(0);
    expect(PROVIDERS.filter((p) => !p.demo).every((p) => !EVENTS.some((e) => e.source === p.id))).toBe(true);
  });
});
