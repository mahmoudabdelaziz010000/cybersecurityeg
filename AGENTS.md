<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep English and Arabic in one shared route tree through `LanguageProvider`; this preserves identical workflows and URLs across languages.
- Keep XDR fixtures and filtering in a browser-safe data module, with configuration drafts held only in page-session state; the prototype must not authorize providers or ingest live data.
  - Exception: the Sophos Firewall dashboard (`/xdr/firewalls`, `src/lib/sophos*.ts`) is a real, read-only integration. It sends only `<Get>` requests, keeps all credentials in server secrets, and sits behind the `SOPHOS_ADMIN_TOKEN` gate. Do not add Set/Remove operations or return credentials to the browser.
- IndexNow (Bing/Yandex fast indexing) key is public by design in `src/lib/indexnow.ts` and `public/<key>.txt`; after publishing content changes, POST changed same-origin page URLs to `/api/public/indexnow` (never URLs that did not change, never more than 20 per call).

## Console layout and routes
- Every page renders inside `ConsoleShell` (`src/components/console-shell.tsx`, mounted in `__root.tsx`): sidebar on desktop, slide-out drawer on mobile, footer below the content. There is no top header.
- `/` is the SOC dashboard (`src/components/soc-dashboard.tsx`). `/xdr` is Telemetry settings, shown under Dashboard in the menu. The old OSINT landing page lives at `/platform`; `/osint` is a 301 redirect to `/`.
- Telemetry pages are one splat route, `src/routes/telemetry.$.tsx`: `/telemetry/<group>` and `/telemetry/<group>/<provider>`. URLs, slugs and active-menu logic live in `src/lib/console-nav.ts` (unit tested). Adding a provider to `PROVIDERS` adds its menu entry, page and sitemap URL automatically. Sophos redirects to its live dashboard `/xdr/firewalls`.
- `routeTree.gen.ts` is generated; if you add a route file without running the dev server, register it there by hand.
