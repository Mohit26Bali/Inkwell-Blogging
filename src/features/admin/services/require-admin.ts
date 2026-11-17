import "server-only";

import { getActiveSession } from "@/server/auth/require-session";

/**
 * Admin check against the LIVE account, not the role frozen into the JWT at sign-in: a demoted, banned
 * or deleted admin loses admin power immediately instead of when the token expires.
 */
export async function requireAdmin() {
  const session = await getActiveSession();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Admin access required.");
  }
  return session;
}
