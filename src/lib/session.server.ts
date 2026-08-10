import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Optional auth: returns the signed-in user id when the request carries a
 * valid bearer token, otherwise null. Used by endpoints that stay usable for
 * anonymous visitors but apply richer quotas once signed in.
 */
export async function getOptionalUserId(): Promise<string | null> {
  const header = getRequestHeader("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  if (token.split(".").length !== 3) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}
