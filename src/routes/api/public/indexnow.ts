import { createFileRoute } from "@tanstack/react-router";

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  INDEXNOW_KEY,
  INDEXNOW_MAX_URLS,
} from "@/lib/indexnow";

interface SubmissionBody {
  /** Single URL to notify, shorthand for urlList. */
  url?: unknown;
  /** Up to 20 same-origin page URLs that were added, updated or removed. */
  urlList?: unknown;
}

/**
 * Parse and validate the request's URLs. Only pages on our own origin are
 * accepted — this is the caller check for this public endpoint, since the
 * IndexNow key itself is public by design.
 */
function collectUrls(body: SubmissionBody): string[] {
  const raw = Array.isArray(body.urlList)
    ? body.urlList
    : typeof body.url === "string"
      ? [body.url]
      : [];
  const urls = new Set<string>();
  for (const value of raw.slice(0, INDEXNOW_MAX_URLS)) {
    if (typeof value !== "string") continue;
    try {
      const parsed = new URL(value);
      if (parsed.hostname.toLowerCase() !== INDEXNOW_HOST) continue;
      if (parsed.protocol !== "https:") continue;
      urls.add(parsed.href);
    } catch {
      // Skip malformed entries rather than failing the whole batch.
    }
  }
  return [...urls];
}

export const Route = createFileRoute("/api/public/indexnow")({
  server: {
    handlers: {
      /** Small self-describing endpoint status, useful when debugging setups. */
      GET: async () =>
        Response.json({
          endpoint: "/api/public/indexnow",
          host: INDEXNOW_HOST,
          keyFileUrl: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
          usage: 'POST {"url": "..."} or {"urlList": ["...", "..."]}',
        }),
      POST: async ({ request }) => {
        let body: SubmissionBody;
        try {
          body = (await request.json()) as SubmissionBody;
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const urlList = collectUrls(body);
        if (urlList.length === 0) {
          return Response.json(
            {
              error: `Provide {"url"} or {"urlList"} with up to ${INDEXNOW_MAX_URLS} https://${INDEXNOW_HOST}/... URLs`,
            },
            { status: 400 },
          );
        }

        const response = await fetch(INDEXNOW_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host: INDEXNOW_HOST, key: INDEXNOW_KEY, urlList }),
        });

        const text = await response.text();
        if (!response.ok) {
          console.error(`IndexNow submit failed [${response.status}]: ${text}`);
          return Response.json(
            {
              error: `IndexNow rejected the submission [${response.status}]`,
              detail: text.slice(0, 500),
            },
            { status: response.status === 403 || response.status === 422 ? response.status : 502 },
          );
        }

        return Response.json({ submitted: urlList.length, status: response.status });
      },
    },
  },
});
