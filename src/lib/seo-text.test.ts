import { describe, expect, test } from "bun:test";
import { MAX_DESCRIPTION, fitDescription } from "./seo-text";

describe("fitDescription", () => {
  test("leaves short descriptions alone and collapses whitespace", () => {
    expect(fitDescription("A short  description.")).toBe("A short description.");
  });
  test("cuts long text at a word boundary within the limit", () => {
    const long = "Traffic decisions, threat logs, policy hits and configuration risk from your network firewalls, including a live read-only Sophos Firewall (NGFW) dashboard. Sample data only.";
    const out = fitDescription(long);
    expect(out.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(out.endsWith("…")).toBe(true);
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  test("handles Arabic text and text without spaces", () => {
    expect(fitDescription("قرارات المرور ".repeat(30)).length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(fitDescription("x".repeat(400)).length).toBe(MAX_DESCRIPTION);
  });
});
