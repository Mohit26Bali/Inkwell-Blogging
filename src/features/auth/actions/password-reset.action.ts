"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";

import { db } from "@/server/db/client";
import { consumeToken, createVerificationToken } from "@/server/auth/email-verification";
import { sendPasswordResetEmail } from "@/server/email/send";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIpFromForwardedFor, getTrustedProxyHops } from "@/lib/client-ip";
import { emailSchema, passwordSchema } from "@/features/auth/schemas/auth.schema";

type Result = { ok: true } | { ok: false; error: string };

const HOUR = 60 * 60 * 1000;
const INVALID_LINK = "This link isn't valid any more. Request a new one.";

/**
 * Starts a password reset. The answer is ALWAYS the same ("if that address has an account, we sent a link"),
 * so this can't be used to find out which e-mail addresses are registered. Limited per address and per
 * network so it can't be used to flood someone's inbox.
 */
export async function requestPasswordResetAction(rawEmail: string): Promise<Result> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data;

  const ip = clientIpFromForwardedFor((await headers()).get("x-forwarded-for"), getTrustedProxyHops());
  if (!checkRateLimit(`reset-ip:${ip ?? "unknown"}`, ip ? { max: 10, windowMs: HOUR } : { max: 100, windowMs: HOUR })) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }
  // Silent per-address cap: beyond 3 mails an hour nothing more is sent, but the answer stays the same.
  if (checkRateLimit(`reset-email:${email}`, { max: 3, windowMs: HOUR })) {
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, isBanned: false },
      select: { email: true, name: true },
    });
    if (user) {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name ?? "there",
        token: await createVerificationToken(user.email, "reset"),
      });
    }
  }
  return { ok: true };
}

/**
 * Sets a new password using a reset link. The link works once and for one hour. Because every session
 * carries a fingerprint of the old password (see server/auth/password-version.ts), all existing sessions of
 * the account stop working at once. Following the link also proves the mailbox is theirs, so it verifies it.
 */
export async function resetPasswordAction(token: string, newPassword: string): Promise<Result> {
  const password = passwordSchema.safeParse(newPassword);
  if (!password.success) return { ok: false, error: password.error.issues[0]?.message ?? "Invalid password." };

  const ip = clientIpFromForwardedFor((await headers()).get("x-forwarded-for"), getTrustedProxyHops());
  if (!checkRateLimit(`reset-use:${ip ?? "unknown"}`, { max: 20, windowMs: HOUR })) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const email = await consumeToken(token, "reset");
  if (!email) return { ok: false, error: INVALID_LINK };

  const passwordHash = await bcrypt.hash(password.data, 12);
  const updated = await db.user.updateMany({
    where: { email: { equals: email, mode: "insensitive" }, isBanned: false },
    data: { passwordHash, emailVerified: new Date() },
  });
  if (updated.count === 0) return { ok: false, error: INVALID_LINK };
  return { ok: true };
}
