import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executePlaybook } from "./workflows.server";

export const runPlaybook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1), target: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => executePlaybook(data.slug, data.target));
