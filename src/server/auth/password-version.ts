import { createHash } from "node:crypto";

/**
 * Short fingerprint of a user's current password hash, stored in the session token at sign-in.
 * When the password changes (e.g. a reset after a suspected break-in) the fingerprint changes, so every
 * session issued before it stops working immediately. Not reversible, and never contains the hash itself.
 */
export function passwordVersion(passwordHash: string | null | undefined): string {
  return createHash("sha256").update(passwordHash ?? "no-password").digest("hex").slice(0, 16);
}
