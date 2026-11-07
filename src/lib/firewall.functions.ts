import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SOPHOS_SECTIONS, type SectionResult } from "./sophos-catalog";

const sectionInput = z.object({
  token: z.string().max(512),
  section: z.enum(SOPHOS_SECTIONS),
  fresh: z.boolean().optional(),
});

export type FirewallSectionResponse = { ok: true; result: SectionResult } | { ok: false; code: "invalid" | "locked" | "unconfigured" };

/**
 * Read one section of the live Sophos firewall dashboard.
 * Always checks the admin token first; read-only; credentials never leave the server.
 * Gate failures come back as `{ ok: false, code }` so the UI does not depend on error text.
 */
export const getFirewallSection = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sectionInput.parse(data))
  .handler(async ({ data }): Promise<FirewallSectionResponse> => {
    const [{ getRequestHeader }, gate, { loadSection }] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("./admin-gate.server"),
      import("./sophos.server"),
    ]);
    const client = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    // No admin token configured: nothing live can be shown, so serve the invented sample data
    // (empty env = every source unconfigured) without asking for a token.
    if (!gate.isAdminConfigured()) return { ok: true, result: await loadSection(data.section, { env: {} }) };
    // An empty token is only the page's "is a token needed?" probe: refuse without counting a failed attempt.
    if (!data.token) return { ok: false, code: "invalid" };
    try {
      await gate.verifyAdminToken(data.token, client);
    } catch (error) {
      if (error instanceof gate.AdminGateError) return { ok: false, code: error.code };
      throw error;
    }
    return { ok: true, result: await loadSection(data.section, { fresh: data.fresh }) };
  });
