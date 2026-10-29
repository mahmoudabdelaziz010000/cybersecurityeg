import { useLocation } from "@tanstack/react-router";
import { Facebook, Share2 } from "lucide-react";
import { FACEBOOK_PAGE_URL, facebookShareUrl } from "@/lib/seo";

/** Pages where a promotional strip would be out of place. */
const HIDDEN_ON = new Set(["/privacy", "/terms"]);

/**
 * Follow + share strip shown above the footer. The share link points at the
 * page the visitor is on, tagged with UTM parameters.
 */
export function FacebookCta() {
  const pathname = useLocation({ select: (location) => location.pathname });
  if (HIDDEN_ON.has(pathname)) return null;

  return (
    <section aria-label="SentinelGrid on Facebook" className="border-t border-border bg-panel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-4 py-8 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-display text-lg font-semibold">Follow SentinelGrid on Facebook</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New playbooks, CVE alerts and practical security guides, posted where you already are.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Facebook className="size-4" aria-hidden="true" /> Follow on Facebook
          </a>
          <a
            href={facebookShareUrl(pathname)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent"
          >
            <Share2 className="size-4" aria-hidden="true" /> Share this page
          </a>
        </div>
      </div>
    </section>
  );
}
