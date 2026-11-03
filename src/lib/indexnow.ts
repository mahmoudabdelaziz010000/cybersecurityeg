/**
 * IndexNow (indexnow.org) lets search engines — Bing, Yandex, Seznam, Yep —
 * pick up new or changed pages within minutes instead of waiting for a crawl.
 * Google is not part of IndexNow.
 *
 * The key is deliberately public: participating engines verify site ownership
 * by fetching `/<key>.txt` and checking that it contains the same key, so it
 * must be served at the site root and must match what we submit.
 */

/** Random site key, verified against public/<key>.txt. */
export const INDEXNOW_KEY = "1ac3df8df747b9429c47d16ed695ea9b";

/** The origin IndexNow submissions claim ownership of. */
export const INDEXNOW_HOST = "cybersecurityeg.lovable.app";

/** IndexNow multi-engine entry point; it fans out to every participating engine. */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

/** IndexNow spec: 10,000 URLs max per request — we keep batches small anyway. */
export const INDEXNOW_MAX_URLS = 20;
