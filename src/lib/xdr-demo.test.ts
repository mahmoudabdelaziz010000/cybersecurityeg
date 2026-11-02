import { describe, expect, test } from "bun:test";
import { EVENTS, PROVIDERS, filterEvents, telemetryMetrics } from "./xdr-demo";

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
});