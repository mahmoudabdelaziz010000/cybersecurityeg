import type { Verdict } from "@/lib/osint-catalog";

const STYLES: Record<Verdict, { className: string; label: string }> = {
  clean: { className: "border-clean/40 bg-clean/10 text-clean", label: "Clean" },
  caution: { className: "border-caution/40 bg-caution/10 text-caution", label: "Caution" },
  malicious: { className: "border-malicious/40 bg-malicious/10 text-malicious", label: "Malicious" },
  unknown: { className: "border-border bg-muted text-muted-foreground", label: "Unknown" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = STYLES[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider ${s.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {s.label}
    </span>
  );
}
