import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/server/db/client";

export type TokenPurpose = "verify" | "reset";

const TTL_MS: Record<TokenPurpose, number> = {
  verify: 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000, // reset links are more sensitive: one hour
};

/**
 * Whether unverified accounts are held back from posting and commenting.
 * Off by default: with Resend's free sandbox sender, mail can only reach the account owner, so turning this
 * on before a sending domain is verified would lock every new user out. Set REQUIRE_EMAIL_VERIFICATION=true
 * once real delivery works.
 */
export function isEmailVerificationRequired(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === "true";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Both kinds share one table. Reset tokens are stored under "reset:<email>", so a reset link can never be
// used as a verification link (or the other way round).
function identifierFor(email: string, purpose: TokenPurpose): string {
  const normalized = email.trim().toLowerCase();
  return purpose === "reset" ? `reset:${normalized}` : normalized;
}

/**
 * Creates a single-use token for an address and returns the RAW token (to put in the e-mail link).
 * Only a SHA-256 hash is stored, so a database leak does not hand out working links.
 * Older tokens of the same kind for the same address are removed, so only the newest link works.
 */
export async function createVerificationToken(email: string, purpose: TokenPurpose = "verify"): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const identifier = identifierFor(email, purpose);

  await db.$transaction([
    db.verificationToken.deleteMany({
      where: { OR: [{ identifier }, { expires: { lt: new Date() } }] },
    }),
    db.verificationToken.create({
      data: { identifier, token: hashToken(token), expires: new Date(Date.now() + TTL_MS[purpose]) },
    }),
  ]);

  return token;
}

/**
 * Atomically consumes a token of the given kind. Returns the e-mail address it was issued for, or null for
 * unknown, already-used, expired or wrong-kind tokens.
 */
export async function consumeToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const hashed = hashToken(token);

  const row = await db.verificationToken.findUnique({ where: { token: hashed } });
  if (!row) return null;
  const isReset = row.identifier.startsWith("reset:");
  if (isReset !== (purpose === "reset")) return null;

  // deleteMany is atomic: when two requests race with the same link, exactly one gets count === 1.
  const removed = await db.verificationToken.deleteMany({ where: { token: hashed } });
  if (removed.count !== 1 || row.expires.getTime() < Date.now()) return null;

  return isReset ? row.identifier.slice("reset:".length) : row.identifier;
}

/** Consumes a verification token and marks the address verified. False for any invalid token. */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const email = await consumeToken(token, "verify");
  if (!email) return false;

  // Matching nothing is fine (account removed, or already verified e.g. via OAuth).
  await db.user.updateMany({
    where: { email: { equals: email, mode: "insensitive" }, emailVerified: null },
    data: { emailVerified: new Date() },
  });
  return true;
}
