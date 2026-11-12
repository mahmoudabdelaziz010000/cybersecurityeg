import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOptionalUserId } from "./session.server";
import {
  listMonitoredDomains,
  registerMonitoredDomain,
  removeMonitoredDomain,
  runDomainAssessment,
  verifyMonitoredDomain,
} from "./attack-surface.server";

async function requireUserId() {
  const userId = await getOptionalUserId();
  if (!userId) throw new Error("Sign in to manage verified domains.");
  return userId;
}

export const listAttackSurfaceDomains = createServerFn({ method: "GET" }).handler(async () => {
  return listMonitoredDomains(await requireUserId());
});

export const registerAttackSurfaceDomain = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ domain: z.string().min(1).max(253) }).parse(data))
  .handler(async ({ data }) => registerMonitoredDomain(await requireUserId(), data.domain));

export const verifyAttackSurfaceDomain = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ domainId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => verifyMonitoredDomain(await requireUserId(), data.domainId));

export const removeAttackSurfaceDomain = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ domainId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => removeMonitoredDomain(await requireUserId(), data.domainId));

export const runAttackSurfaceAssessment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ domainId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => runDomainAssessment(await requireUserId(), data.domainId));
