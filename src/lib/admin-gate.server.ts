/**
 * Shared-secret gate for the live firewall pages.
 *
 * The site has no user accounts, so real firewall data is protected by one secret held in the
 * server environment (SOPHOS_ADMIN_TOKEN, 16+ characters). The browser keeps the token in
 * memory only. Failed attempts are rate limited per client address (best effort: the counter
 * lives in this server instance's memory).
 */
export type AdminGateCode = "invalid" | "locked" | "unconfigured";

export class AdminGateError extends Error {
  readonly code: AdminGateCode;
  constructor(code: AdminGateCode, message: string) {
    super(message);
    this.name = "AdminGateError";
    this.code = code;
  }
}

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const MAX_TRACKED = 2000;
const failures = new Map<string, { count: number; first: number }>();

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

/** Constant-time comparison (both sides are hashed first, so length does not leak). */
export async function tokensMatch(candidate: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(candidate), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** True when SOPHOS_ADMIN_TOKEN is set well enough to protect live data. */
export function isAdminConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return (env["SOPHOS_ADMIN_TOKEN"] ?? "").length >= 16;
}

export function resetAdminGate(): void {
  failures.clear();
}

export async function verifyAdminToken(token: string, clientKey: string, env: Record<string, string | undefined> = process.env): Promise<void> {
  const expected = env["SOPHOS_ADMIN_TOKEN"];
  if (!expected || expected.length < 16) {
    throw new AdminGateError("unconfigured", "Admin access is not configured. Set SOPHOS_ADMIN_TOKEN (16 or more characters) in the server environment.");
  }
  const now = Date.now();
  const entry = failures.get(clientKey);
  if (entry && now - entry.first >= WINDOW_MS) failures.delete(clientKey);
  const current = failures.get(clientKey);
  if (current && current.count >= MAX_FAILURES) throw new AdminGateError("locked", "Too many failed attempts. Try again in a few minutes.");
  if (await tokensMatch(token, expected)) {
    failures.delete(clientKey);
    return;
  }
  if (failures.size >= MAX_TRACKED) failures.delete(failures.keys().next().value as string);
  failures.set(clientKey, { count: (current?.count ?? 0) + 1, first: current?.first ?? now });
  throw new AdminGateError("invalid", "Invalid admin token.");
}
