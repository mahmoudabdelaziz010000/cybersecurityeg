import { createFileRoute, redirect } from "@tanstack/react-router";

/** The SOC dashboard moved to the home page; keep old links and search rankings working. */
export const Route = createFileRoute("/osint")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
