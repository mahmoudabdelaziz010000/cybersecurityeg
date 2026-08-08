import { createServerFn } from "@tanstack/react-start";
import { fetchRecentCves } from "./cve.server";

export const getRecentCves = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return { items: await fetchRecentCves(20), error: null as string | null };
  } catch (e) {
    return { items: [], error: e instanceof Error ? e.message : "feed unavailable" };
  }
});
