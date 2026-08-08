import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scanTarget } from "./osint.server";

export const runHubScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        targets: z.array(z.string().min(1)).min(1).max(10),
        sources: z.array(z.string()).min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => ({
    results: await Promise.all(data.targets.map((t) => scanTarget(t, data.sources))),
  }));
