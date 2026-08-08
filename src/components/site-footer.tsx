import { Link } from "@tanstack/react-router";
import { ShieldHalf } from "lucide-react";

const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { to: "/osint", label: "OSINT Data Hub" },
      { to: "/workflows", label: "Automation Workflows" },
      { to: "/attack-surface", label: "Attack Surface Monitoring" },
      { to: "/threat-intel", label: "Threat Intelligence" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/pricing", label: "Pricing" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
      { to: "/refund", label: "Refund Policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-panel">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <ShieldHalf className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="font-display text-[15px] font-semibold">
              Sentinel<span className="text-primary">Grid</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Passive OSINT, attack-surface monitoring and decision-ready automation for security
            teams that are drowning in alerts.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="label-mono">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} SentinelGrid. Passive reconnaissance only.</p>
          <p className="font-mono">Zero-key connectors · Evidence-first output</p>
        </div>
      </div>
    </footer>
  );
}
