import { useMemo, useState } from "react";

type Scenario = "Port scan" | "Brute force" | "SQL injection";
type Action = "Detect" | "Block" | "Allow";
const scenarios: Record<Scenario, { source: string; detail: string; signature: string }> = {
  "Port scan": { source: "198.51.100.24", detail: "Sequential connection attempts across 20 destination ports", signature: "ET SCAN Potential TCP Scan" },
  "Brute force": { source: "203.0.113.77", detail: "Repeated failed SSH authentication attempts", signature: "ET POLICY SSH Brute Force" },
  "SQL injection": { source: "192.0.2.41", detail: "Request contains a SQL injection test pattern", signature: "WEB-APP SQL Injection Attempt" },
};

export function IpsLab() {
  const [scenario, setScenario] = useState<Scenario>("Port scan");
  const [action, setAction] = useState<Action>("Detect");
  const [events, setEvents] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    try {
      const value: unknown = JSON.parse(input);
      const rows = Array.isArray(value) ? value : [value];
      return rows.map((row) => JSON.stringify(row, null, 2));
    } catch {
      return null;
    }
  }, [input]);
  const current = scenarios[scenario];

  return <section id="ips-lab" className="surface-raised mt-12 p-6 sm:p-8">
    <p className="label-mono">Interactive IPS Lab · simulation only</p>
    <h2 className="mt-2 text-2xl font-bold">See a policy decision</h2>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">This browser-only demo generates fictional events. It does not send traffic, contact a firewall, or represent live telemetry.</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <label className="block text-sm">Scenario<select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)} className="mt-1 block w-full rounded-md border border-border bg-background p-2">{Object.keys(scenarios).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="block text-sm">IPS action<select value={action} onChange={(e) => setAction(e.target.value as Action)} className="mt-1 block w-full rounded-md border border-border bg-background p-2">{(["Detect", "Block", "Allow"] as const).map((s) => <option key={s}>{s}</option>)}</select></label>
        <div className="rounded-md border border-border bg-background p-4 text-sm"><p><b>Sample source:</b> {current.source}</p><p className="mt-1"><b>Activity:</b> {current.detail}</p><p className="mt-1"><b>Signature:</b> {current.signature}</p><p className="mt-2 font-mono text-xs text-caution">SIMULATED EVENT — no packet or firewall action occurred</p></div>
        <button type="button" onClick={() => setEvents((old) => [`${new Date().toLocaleTimeString()} · ${scenario} · ${action} · simulated`, ...old].slice(0, 8))} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Run simulation</button>
        {events.length > 0 && <ol aria-live="polite" className="space-y-1 text-xs text-muted-foreground">{events.map((event, i) => <li key={`${event}-${i}`}>{event}</li>)}</ol>}
      </div>
      <div>
        <label htmlFor="ips-json" className="block text-sm font-medium">Suricata EVE / Snort JSON sample parser</label>
        <textarea id="ips-json" rows={7} value={input} onChange={(e) => setInput(e.target.value)} placeholder={'Paste a JSON object or array, e.g. {"event_type":"alert","src_ip":"192.0.2.10"}'} className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-xs" />
        {input.trim() && <div className="mt-2 rounded-md border border-border bg-background p-3 text-xs">{parsed ? <><p className="mb-2 text-clean">Valid JSON · {parsed.length} record(s) · parsed locally</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap">{parsed.join("\n\n")}</pre></> : <p className="text-caution">Invalid JSON. Provide a JSON object or array.</p>}</div>}
      </div>
    </div>
  </section>;
}
