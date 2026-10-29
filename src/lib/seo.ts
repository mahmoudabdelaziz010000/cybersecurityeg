/** Canonical origin of the production site. Used for absolute canonical, Open Graph and sitemap URLs. */
export const SITE_URL = "https://cybersecurityeg.lovable.app";

export const FACEBOOK_PAGE_URL = "https://www.facebook.com/share/1CPDRXEYMG/?mibextid=wwXIfr";

/** Build an absolute URL for a site path such as "/osint". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
