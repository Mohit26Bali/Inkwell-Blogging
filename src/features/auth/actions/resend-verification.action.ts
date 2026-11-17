"use server";

import { getActiveSession } from "@/server/auth/require-session";
import { createVerificationToken } from "@/server/auth/email-verification";
import { allowAction } from "@/server/security/action-limits";
import { sendVerificationEmail } from "@/server/email/send";

type ResendResult =
  | { status: "sent" }
  | { status: "already-verified" }
  | { status: "error"; error: string };

/** Sends the signed-in user a fresh verification link (limited to a few per hour). */
export async function resendVerificationAction(): Promise<ResendResult> {
  const session = await getActiveSession();
  if (!session) return { status: "error", error: "Please sign in first." };
  if (session.user.emailVerified) return { status: "already-verified" };

  if (!allowAction("verifyEmail", session.user.id)) {
    return { status: "error", error: "Too many requests. Please try again in a while." };
  }

  await sendVerificationEmail({
    to: session.user.email,
    name: session.user.name ?? "there",
    token: await createVerificationToken(session.user.email),
  });
  return { status: "sent" };
}
