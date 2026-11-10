import { describe, expect, test } from "bun:test";
import { IPS_ARTICLES } from "./ips-content";
import { MAX_DESCRIPTION } from "./seo-text";

describe("IPS guides SEO", () => {
  test("slugs are unique and URL safe", () => {
    const slugs = IPS_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
  test("titles fit a search result and descriptions stay under the limit", () => {
    for (const a of IPS_ARTICLES) {
      expect(`${a.title} | SentinelGrid`.length).toBeLessThanOrEqual(60);
      expect(a.description.length).toBeGreaterThan(60);
      expect(a.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    }
    expect(new Set(IPS_ARTICLES.map((a) => a.title)).size).toBe(IPS_ARTICLES.length);
  });
});
