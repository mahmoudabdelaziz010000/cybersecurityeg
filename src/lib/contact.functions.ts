import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(180),
  topic: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10).max(5000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
    });

    if (error) {
      throw new Error("We couldn't deliver your message. Please email us directly.");
    }

    return { ok: true as const };
  });
