import { translateText } from "@/lib/language";
import { fitDescription } from "@/lib/seo-text";

export { fitDescription } from "@/lib/seo-text";

/** Canonical origin of the production site. Used for absolute canonical, Open Graph and sitemap URLs. */
export const SITE_URL = "https://cybersecurityeg.lovable.app";

/** The SentinelGrid Facebook Page. */
export const FACEBOOK_PAGE_URL = "https://www.facebook.com/cybersecurityeg";

/**
 * Languages the site is served in. English and Arabic share one route tree, so
 * every page has the same path in both; Arabic is the same path with `?lang=ar`.
 */
export type SiteLanguage = "en" | "ar";

/** Build an absolute URL for a site path such as "/osint". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

/** Absolute URL of a page in one language: "/osint" becomes ".../osint?lang=ar" for Arabic. */
export function localizedUrl(path: string, lang: SiteLanguage = "en"): string {
  if (lang === "en") return absoluteUrl(path);
  return path === "/" ? `${SITE_URL}/?lang=ar` : `${absoluteUrl(path)}?lang=ar`;
}

/** The language a request asked for, read from the route match's search params. Never throws. */
export function headLanguage(ctx: { match?: { search?: unknown } } | undefined): SiteLanguage {
  const search = ctx?.match?.search as { lang?: unknown } | undefined;
  return search?.lang === "ar" ? "ar" : "en";
}

/** hreflang alternates so search engines pair each page's English and Arabic versions. */
export function alternateLinks(path: string) {
  return [
    { rel: "alternate", hrefLang: "en", href: localizedUrl(path, "en") },
    { rel: "alternate", hrefLang: "ar", href: localizedUrl(path, "ar") },
    { rel: "alternate", hrefLang: "x-default", href: localizedUrl(path, "en") },
  ];
}

/**
 * Facebook share dialog URL for a site path. The shared link carries UTM
 * parameters so Facebook-referred visits can be told apart in analytics; the
 * page's canonical tag keeps the UTM variant out of search results. Arabic
 * readers share the Arabic version, so their friends get an Arabic preview card.
 */
export function facebookShareUrl(path: string, campaign = "page_share", lang: SiteLanguage = "en"): string {
  const params = new URLSearchParams();
  if (lang === "ar") params.set("lang", "ar");
  params.set("utm_source", "facebook");
  params.set("utm_medium", "share");
  params.set("utm_campaign", campaign);
  const target = `${absoluteUrl(path)}?${params.toString()}`;
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

/** Site-wide fallback share card for pages that have no card of their own. */
export function defaultOgImageMeta() {
  const url = `${SITE_URL}/og-image.png`;
  return [
    { property: "og:image", content: url },
    { property: "og:image:alt", content: "SentinelGrid: XDR console and cybersecurity tools" },
    { name: "twitter:image", content: url },
  ];
}

interface PageHeadOptions {
  /** Site path, e.g. "/osint". */
  path: string;
  /** English title and description; the Arabic ones come from the translation dictionary. */
  title: string;
  description: string;
  lang: SiteLanguage;
  type?: "website" | "article";
  image?: { slug: string; alt: string };
}

/**
 * Title, description, Open Graph, Twitter, canonical and hreflang tags for one
 * page in one language. Rendered on the server, so crawlers that do not run
 * JavaScript (Facebook's, for one) still get the right language.
 */
export function pageHead({ path, title, description, lang, type = "website", image }: PageHeadOptions) {
  const pageTitle = lang === "ar" ? translateText(title) : title;
  const pageDescription = fitDescription(lang === "ar" ? translateText(description) : description);
  const url = localizedUrl(path, lang);

  return {
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:locale", content: lang === "ar" ? "ar_AR" : "en_US" },
      { property: "og:locale:alternate", content: lang === "ar" ? "en_US" : "ar_AR" },
      // Pages without their own card still get a share image instead of a bare link preview.
      ...(image ? ogImageMeta(image.slug, image.alt) : defaultOgImageMeta()),
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [{ rel: "canonical", href: url }, ...alternateLinks(path)],
  };
}
