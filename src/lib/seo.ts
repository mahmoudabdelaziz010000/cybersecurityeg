/** Canonical origin of the production site. Used for absolute canonical, Open Graph and sitemap URLs. */
export const SITE_URL = "https://cybersecurityeg.lovable.app";

/** The SentinelGrid Facebook Page. */
export const FACEBOOK_PAGE_URL = "https://www.facebook.com/cybersecurityeg";

/** Build an absolute URL for a site path such as "/osint". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

/**
 * Facebook share dialog URL for a site path. The shared link carries UTM
 * parameters so Facebook-referred visits can be told apart in analytics; the
 * page's canonical tag keeps the UTM variant out of search results.
 */
export function facebookShareUrl(path: string, campaign = "page_share"): string {
  const target = `${absoluteUrl(path)}?utm_source=facebook&utm_medium=share&utm_campaign=${campaign}`;
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(target)}`;
}

/** Per-page share card (1200x630) used by Facebook, X and LinkedIn previews. */
export function ogImageMeta(slug: string, alt: string) {
  const url = `${SITE_URL}/og/${slug}.png`;
  return [
    { property: "og:image", content: url },
    { property: "og:image:alt", content: alt },
    { name: "twitter:image", content: url },
  ];
}
