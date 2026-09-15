import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Menu, ShieldHalf, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";

const NAV = [
  { to: "/osint", label: "OSINT Hub" },
  { to: "/owasp", label: "OWASP Scanner" },
  { to: "/workflows", label: "Workflows" },
  { to: "/attack-surface", label: "Attack Surface" },
  { to: "/threat-intel", label: "Threat Intel" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="SentinelGrid home">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldHalf className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Sentinel<span className="text-primary">Grid</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {!loading && user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" /> Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-md border border-border p-2 lg:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-panel px-4 py-3 lg:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {[...NAV, { to: "/contact", label: "Contact" } as const].map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to={!loading && user ? "/dashboard" : "/auth"}
            onClick={() => setOpen(false)}
            className="mt-3 block rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
          >
            {!loading && user ? "Open dashboard" : "Start free"}
          </Link>
        </nav>
      )}
    </header>
  );
}
