import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runCheck, normalizeUrl } from "./owasp.server";
import { authorizeScan, recordScanRuns } from "./quota.server";
import { getOptionalUserId } from "./session.server";
import { scoreFindings } from "./owasp-catalog";
import type { Finding } from "./owasp-catalog";

/** Runs a single OWASP check so the UI can report progress as each one lands. */
export const runOwaspCheck = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        target: z.string().min(3).max(255),
        checkId: z.string().min(1).max(40),
      })
      .parse(data),
  )
  .handler(async ({ data }) => runCheck(data.checkId, data.target));

/** Called once before a scan: enforces plan quota and returns the normalised target. */
export const startOwaspScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ target: z.string().min(3).max(255) }).parse(data))
  .handler(async ({ data }) => {
    const userId = await getOptionalUserId();
    await authorizeScan(userId, 1);
    return { target: normalizeUrl(data.target), authenticated: Boolean(userId) };
  });

/** Called once after a scan completes so the run appears in the user's history. */
export const recordOwaspScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        target: z.string().min(3).max(255),
        findings: z
          .array(
            z.object({
              severity: z.enum(["critical", "high", "medium", "low", "info"]),
            }),
          )
          .max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await getOptionalUserId();
    if (!userId) return { saved: false };

    const score = scoreFindings(data.findings as Finding[]);
    const verdict = score >= 75 ? "malicious" : score >= 25 ? "caution" : "clean";

    await recordScanRuns(userId, [
      {
        kind: "osint",
        label: "OWASP web scan",
        target: normalizeUrl(data.target),
        verdict,
        score,
      },
    ]);
    return { saved: true };
  });
