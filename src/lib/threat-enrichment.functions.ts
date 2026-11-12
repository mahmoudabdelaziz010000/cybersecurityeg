import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeEnrichment, normalizeIndicator } from "./threat-enrichment";
import { availableThreatSources, enrichIndicator } from "./threat-enrichment.server";

export const getThreatEnrichmentConfig = createServerFn({ method: "GET" }).handler(() => ({ sources: availableThreatSources() }));

export const runThreatEnrichment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ indicators: z.array(z.string().min(1).max(2048)).min(1).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const normalized = data.indicators.map((value) => normalizeIndicator(value));
    const deduped = [...new Map(normalized.map((item) => [item.indicator, item])).values()];
    const results = await Promise.all(deduped.map(async ({ indicator, type }) => normalizeEnrichment({ indicator, type, sources: await enrichIndicator(indicator, type) })));
    return { results, sources: availableThreatSources(), requested: data.indicators.length, unique: results.length };
  });

