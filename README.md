# Growth Engine

Rebuild and optimize for SEO, workflows, cybersecurity monetization

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3dbc662c-4d70-45d5-889b-6cd14c3d2f1a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Sophos Firewall (NGFW) dashboard

The **Intrusion prevention (IPS)** section is an interactive browser (search, severity/category/action filters, sortable table, signature detail, policies, rule coverage). Live data comes from the `IPSPolicy` and `FirewallRule` API entities: the Sophos API returns each policy's signature *rule groups*, not individual signature IDs, so single signatures (IDs, CVEs, hit charts) appear in the labelled sample data only.

`/xdr/firewalls` (XDR Telemetry → Firewalls) shows live, **read-only** data from a Sophos Firewall and Sophos Central. The sidebar covers: Overview, Basic settings (interfaces, zones, IP hosts, static routes, DNS), Firewall policies, Misconfiguration, DoS attacks, Web control, Applications control, Email, General settings and Sophos Central sync.

Only `<Get>` requests are ever sent to the firewall. All credentials are **server-side secrets** — set them in the server environment (e.g. Lovable Cloud secrets), never in `.env` (which is committed) and never in the browser:

| Secret | Purpose |
| --- | --- |
| `SOPHOS_ADMIN_TOKEN` | 16+ character token required to open the page (kept in browser memory only; failed attempts are rate limited) |
| `SOPHOS_FW_HOST`, `SOPHOS_FW_USERNAME`, `SOPHOS_FW_PASSWORD` | Firewall XML API login (use a read-only admin profile). Set all three together |
| `SOPHOS_FW_PORT` | Optional, default `4444` |
| `SOPHOS_FW_CA_CERT` | Optional PEM (or base64 PEM) if the firewall uses a self-signed certificate |
| `SOPHOS_FW_API_VERSION` | Optional, e.g. `2200.1` |
| `SOPHOS_CENTRAL_CLIENT_ID`, `SOPHOS_CENTRAL_CLIENT_SECRET` | Sophos Central API client (for the Central sync section). Set both together |

On the firewall, enable API configuration and allow the app server's IP address (see Sophos' "XML API" documentation for your firmware), and make sure the firewall's admin port is reachable from wherever the server runs.
