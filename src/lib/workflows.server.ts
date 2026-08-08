import { scanTarget } from "./osint.server";
import { PLAYBOOKS, type StepRun, type WorkflowRun } from "./playbooks";
import type { Verdict } from "./osint-catalog";

function recommend(verdict: Verdict): string {
  switch (verdict) {
    case "malicious":
      return "Block at the perimeter and open a P2 incident. Evidence for each step is attached below.";
    case "caution":
      return "Escalate to an analyst for manual review — signals are mixed but not conclusive.";
    case "clean":
      return "No blocking signals found. Close the ticket and keep this evidence trail for audit.";
    default:
      return "No source could answer for this target. Re-run with a different indicator type.";
  }
}

export async function executePlaybook(slug: string, target: string): Promise<WorkflowRun> {
  const playbook = PLAYBOOKS.find((p) => p.slug === slug);
  if (!playbook) throw new Error("Unknown playbook");

  const steps: StepRun[] = [];
  let score = 0;
  let answeredAny = false;

  for (const step of playbook.steps) {
    const result = await scanTarget(target, step.sources);
    const answered = result.sources.filter((s) => s.ok);

    if (!answered.length) {
      steps.push({
        id: step.id,
        title: step.title,
        status: "failed",
        findings: ["No source in this step could answer for this target type."],
        facts: [],
      });
      continue;
    }

    answeredAny = true;
    score = Math.max(score, result.score);
    steps.push({
      id: step.id,
      title: step.title,
      status: answered.length === result.sources.length ? "ok" : "partial",
      findings: result.headline.length ? result.headline : ["No adverse signals from this step."],
      facts: answered.flatMap((s) => s.facts.map((f) => ({ key: `${s.label} · ${f.key}`, value: f.value }))),
    });
  }

  const verdict: Verdict = !answeredAny
    ? "unknown"
    : score >= 60
      ? "malicious"
      : score >= 25
        ? "caution"
        : "clean";

  return {
    playbook: playbook.name,
    target,
    verdict,
    score,
    steps,
    recommendation: recommend(verdict),
    finishedAt: new Date().toISOString(),
  };
}
