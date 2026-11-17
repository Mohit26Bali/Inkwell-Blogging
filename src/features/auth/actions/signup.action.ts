"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";

import { db } from "@/server/db/client";
import { signupSchema, type SignupInput } from "@/features/auth/schemas/auth.schema";
import { sendWelcomeEmail, sendVerificationEmail } from "@/server/email/send";
import {
  createVerificationToken,
  isEmailVerificationRequired,
} from "@/server/auth/email-verification";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIpFromForwardedFor, getTrustedProxyHops } from "@/lib/client-ip";
import { allowAction } from "@/server/security/action-limits";

type SignupResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Partial<Record<keyof SignupInput, string[]>> };

const SIGNUP_RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };
// Without a configured proxy no client address is known, so every visitor would share one bucket;
// use a much larger shared cap in that case instead of letting 5 signups block the whole site.
const SIGNUP_RATE_LIMIT_UNKNOWN_IP = { max: 60, windowMs: 60 * 60 * 1000 };
const SIGNUP_PER_EMAIL_LIMIT = { max: 3, windowMs: 60 * 60 * 1000 };

export async function signupAction(input: SignupInput): Promise<SignupResult> {
  const headerList = await headers();
  // X-Forwarded-For is only trusted behind a known number of proxies (TRUSTED_PROXY_HOPS); otherwise a
  // client could rotate fake addresses to dodge this limit.
  const ip = clientIpFromForwardedFor(headerList.get("x-forwarded-for"), getTrustedProxyHops());

  if (!checkRateLimit(`signup:${ip ?? "unknown"}`, ip ? SIGNUP_RATE_LIMIT : SIGNUP_RATE_LIMIT_UNKNOWN_IP)) {
    return { success: false, error: "Too many signups from this network. Try again later." };
  }

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, username, email, password } = parsed.data;

  if (!checkRateLimit(`signup-email:${email}`, SIGNUP_PER_EMAIL_LIMIT)) {
    return { success: false, error: "Too many attempts for this email address. Try again later." };
  }

  const [existingEmail, existingUsername] = await Promise.all([
    db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    }),
    db.profile.findUnique({ where: { username } }),
  ]);

  if (existingEmail) {
    return { success: false, error: "An account with this email already exists" };
  }
  if (existingUsername) {
    return { success: false, error: "This username is already taken" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "READER",
        profile: { create: { username } },
        settings: { create: {} },
      },
    });
  } catch (error) {
    // Two signups for the same e-mail/username at once: the unique constraint decides, politely.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return { success: false, error: "An account with these details already exists" };
    }
    throw error;
  }

  // The address is not verified (yet), so never send it more than one welcome/verification mail per hour.
  if (allowAction("welcomeEmail", email)) {
    if (isEmailVerificationRequired()) {
      await sendVerificationEmail({ to: email, name, token: await createVerificationToken(email) });
    } else {
      await sendWelcomeEmail({ to: email, name });
    }
  }

  return { success: true };
}
