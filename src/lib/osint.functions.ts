import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scanTarget } from "./osint.server";
import { authorizeScan, recordScanRuns } from "./quota.server";
import { getOptionalUserId } from "./session.server";

export const runHubScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        targets: z.array(z.string().min(1).max(255)).min(1).max(25),
        sources: z.array(z.string()).min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getOptionalUserId();
    await authorizeScan(userId, data.targets.length);

    const results = await Promise.all(data.targets.map((t) => scanTarget(t, data.sources)));

    await recordScanRuns(
      userId,
      results.map((r) => ({
        kind: "osint" as const,
        label: "OSINT hub scan",
        target: r.target,
        verdict: r.verdict,
        score: r.score,
      })),
    );

    return { results, authenticated: Boolean(userId) };
  });
