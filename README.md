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
# Aggregated Threat Enrichment

The Security Assessment Center includes a server-side IOC enrichment dashboard for IPv4/IPv6, domain names, HTTP(S) URLs, and MD5/SHA-1/SHA-256 hashes. It queries ThreatFox, AbuseIPDB, Pulsedive, and URLhaus when their server keys are configured. Unsupported source/indicator combinations and missing credentials are shown as unavailable; provider errors and no-match results remain distinct.

## Setup

Configure these environment variables in the server deployment or local server environment. Never use `VITE_`-prefixed variables for provider credentials:

| Variable | Provider | Where to obtain it |
| --- | --- | --- |
| `THREATFOX_API_KEY` | ThreatFox | Free abuse.ch authentication portal key |
| `ABUSEIPDB_API_KEY` | AbuseIPDB | AbuseIPDB account API key |
| `PULSEDIVE_API_KEY` | Pulsedive | Pulsedive API key |
| `URLHAUS_API_KEY` | URLhaus | Free abuse.ch authentication portal key |

The feature does not ask users to enter credentials. Each configured key stays on the server. The four keys are independent; an absent key disables only that provider.

## Supported lookups and service limits

- ThreatFox searches exact IP, domain, URL, and file hash indicators. The community API requires an abuse.ch Auth-Key and is subject to abuse.ch fair-use principles; old IOCs can expire from API results.
- AbuseIPDB checks IPv4 and IPv6 only, looking back 90 days. Its free individual tier currently allows 1,000 checks and reports per day.
- Pulsedive searches IPs, domains, and URLs. Its free account tier is noncommercial and currently limited to 1 request/second, 50 API requests/day, and 500/month. Requests are paced server-side at roughly one per second.
- URLhaus queries URLs, hostnames/IPs, and MD5/SHA-256 payload hashes. SHA-1 is not supported by its payload lookup. The community API requires an abuse.ch Auth-Key and is subject to abuse.ch fair-use principles.

Limits and terms can change. Confirm each provider's current terms before use; Pulsedive's free tier is explicitly noncommercial, and AbuseIPDB free access is intended for personal/evaluation use. Do not use a free community key for commercial service unless the provider's terms allow it.

## Caching, scoring, and limitations

Successful, unavailable, and failed source results are cached in server-process memory for 15 minutes per provider and normalized indicator. This is a best-effort cache: it is not shared between instances and clears on restart. Batches accept up to 10 indicators. Pulsedive requests are serialized and paced to respect its free limit. Timeouts are 10 seconds per source request.

Findings are deduplicated by provider and record ID. Each finding preserves provider attribution, the provider observation time when supplied, a source reference, and confidence when available. The dashboard's 0–100 score starts from the strongest positive finding (35 + 55% of provider confidence; default confidence 70 where none is supplied) and adds up to 15 points for additional independent providers, capped at 100. Score bands are critical (90+), high (75–89), medium (50–74), and low (1–49). A zero score or no match is never a safety verdict; unavailable/failed sources mean incomplete coverage. The UI shows the rationale and each source state.

Provider data can be stale, incomplete, or wrong. IOC checks send the submitted indicator to each configured provider. Do not submit sensitive or internal-only indicators unless your data handling policy permits it. This feature performs lookups only; it does not submit IOCs or download payloads.

