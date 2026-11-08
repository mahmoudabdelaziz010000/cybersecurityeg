import { describe, expect, test } from "bun:test";
import { SOPHOS_SECTIONS } from "./sophos-catalog";
import { GROUPS, PROVIDERS } from "./xdr-demo";
import {
  GROUP_BLURB, GROUP_SLUG, SOPHOS_DASHBOARD_PATH, allTelemetryPaths, groupFromSlug, navActiveFor,
  parseTelemetryPath, providersOf, telemetryPath, telemetrySplat,
} from "./console-nav";

describe("telemetry groups", () => {
  test("every group has a unique URL slug, a blurb in both languages and at least one provider", () => {
    const slugs = GROUPS.map((group) => GROUP_SLUG[group]);
    expect(new Set(slugs).size).toBe(GROUPS.length);
    for (const group of GROUPS) {
      expect(groupFromSlug(GROUP_SLUG[group])).toBe(group);
      expect(GROUP_BLURB[group][0].length).toBeGreaterThan(20);
      expect(GROUP_BLURB[group][1].length).toBeGreaterThan(20);
      expect(providersOf(group).length).toBeGreaterThan(0);
    }
  });

  test("slugs are URL safe", () => {
    for (const slug of Object.values(GROUP_SLUG)) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("parseTelemetryPath", () => {
  test("parses group and provider pages and ignores slashes at the ends", () => {
    expect(parseTelemetryPath("firewalls")?.group).toBe("Firewalls");
    expect(parseTelemetryPath("firewalls/")?.provider).toBeUndefined();
    expect(parseTelemetryPath("/ai-apis/gemini")?.provider?.id).toBe("gemini");
    expect(parseTelemetryPath("firewalls/sophos")?.provider?.id).toBe("sophos");
  });

  test("rejects unknown groups, providers from another group and deeper paths", () => {
    expect(parseTelemetryPath(undefined)).toBeNull();
    expect(parseTelemetryPath("")).toBeNull();
    expect(parseTelemetryPath("nope")).toBeNull();
    expect(parseTelemetryPath("firewalls/gemini")).toBeNull();
    expect(parseTelemetryPath("firewalls/paloalto/extra")).toBeNull();
    expect(parseTelemetryPath("Firewalls")).toBeNull();
  });

  test("round-trips every provider", () => {
    for (const provider of PROVIDERS) {
      const target = parseTelemetryPath(telemetrySplat(provider.group, provider));
      expect(target?.group).toBe(provider.group);
      expect(target?.provider?.id).toBe(provider.id);
    }
  });
});

describe("allTelemetryPaths", () => {
  const paths = allTelemetryPaths();

  test("lists each group and each provider once, without duplicates", () => {
    expect(new Set(paths).size).toBe(paths.length);
    for (const group of GROUPS) expect(paths).toContain(telemetryPath(group));
    expect(paths.length).toBe(GROUPS.length + PROVIDERS.length - 1);
  });

  test("leaves the token-protected Sophos dashboard out of the indexable list", () => {
    expect(paths).not.toContain("/telemetry/firewalls/sophos");
    expect(paths).toContain("/telemetry/firewalls/paloalto");
  });
});

describe("navActiveFor", () => {
  test("home is the SOC overview and /xdr is the settings entry", () => {
    expect(navActiveFor("/").area).toBe("soc");
    expect(navActiveFor("/xdr").area).toBe("settings");
  });

  test("telemetry pages activate their group and provider", () => {
    expect(navActiveFor("/telemetry/cloud")).toEqual({ area: "telemetry", group: "Cloud" });
    expect(navActiveFor("/telemetry/cloud/aws/")).toEqual({ area: "telemetry", group: "Cloud", providerId: "aws" });
  });

  test("the Sophos dashboard activates Firewalls > Sophos and its section, defaulting to overview", () => {
    expect(navActiveFor(SOPHOS_DASHBOARD_PATH).section).toBe(SOPHOS_SECTIONS[0]);
    expect(navActiveFor(SOPHOS_DASHBOARD_PATH, "dos")).toMatchObject({ group: "Firewalls", providerId: "sophos", section: "dos" });
    expect(navActiveFor(SOPHOS_DASHBOARD_PATH, "bogus").section).toBe(SOPHOS_SECTIONS[0]);
  });

  test("other pages are tools; unknown telemetry paths fall back to a tool page", () => {
    expect(navActiveFor("/osint-hub").area).toBe("tool");
    expect(navActiveFor("/telemetry/unknown").area).toBe("tool");
    expect(navActiveFor("/platform").area).toBe("none");
  });
});
