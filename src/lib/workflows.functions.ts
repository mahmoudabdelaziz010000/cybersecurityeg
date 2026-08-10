import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executePlaybook } from "./workflows.server";
import { authorizeScan, recordScanRuns } from "./quota.server";
import { getOptionalUserId } from "./session.server";

export const runPlaybook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1), target: z.string().min(1).max(255) }).parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getOptionalUserId();
    await authorizeScan(userId, 1);

    const run = await executePlaybook(data.slug, data.target);

    await recordScanRuns(userId, [
      {
        kind: "playbook",
        label: run.playbook,
        target: run.target,
        verdict: run.verdict,
        score: run.score,
      },
    ]);

    return run;
  });
