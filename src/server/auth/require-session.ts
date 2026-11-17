import "server-only";

import type { Role } from "@prisma/client";

import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { passwordVersion } from "@/server/auth/password-version";
import { isEmailVerificationRequired } from "@/server/auth/email-verification";

export type ActiveSession = {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    username: string | null;
    emailVerified: boolean;
  };
};

/**
 * The signed-in user, verified against the DATABASE on every call.
 *
 * Sessions are JWTs: the role, and the fact that an account is fine, are frozen at sign-in and the token
 * stays valid for weeks. Trusting it alone meant a banned user kept posting, and a demoted admin kept
 * admin powers, until the token expired. So every action re-reads the account (one small query) and
 * refuses when it is deleted, banned or suspended. The role used for permission checks is the live one.
 *
 * Returns null when nobody is signed in or the account may not act.
 */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      isSuspended: true,
      emailVerified: true,
      passwordHash: true,
      profile: { select: { username: true } },
    },
  });
  if (!user || user.isBanned || user.isSuspended) return null;
  // The password changed since this session was created (reset/change): the session is no longer valid.
  // (Sessions created before this check existed carry no fingerprint and are left alone.)
  const pwv = session?.user?.pwv;
  if (pwv && pwv !== passwordVersion(user.passwordHash)) return null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      username: user.profile?.username ?? null,
      emailVerified: user.emailVerified !== null,
    },
  };
}

/**
 * requireSession() plus, when REQUIRE_EMAIL_VERIFICATION=true, a confirmed e-mail address. Used for actions
 * that publish content (posts, comments); likes/bookmarks stay open to unverified accounts.
 */
export async function requireVerifiedSession(message = "You must be signed in."): Promise<ActiveSession> {
  const session = await requireSession(message);
  if (isEmailVerificationRequired() && !session.user.emailVerified) {
    throw new Error("Please verify your email address first (open /verify-email to get a new link).");
  }
  return session;
}

/** Like getActiveSession() but throws a helpful error instead of returning null. */
export async function requireSession(message = "You must be signed in."): Promise<ActiveSession> {
  const session = await auth();
  if (!session?.user?.id) throw new Error(message);

  const active = await getActiveSession();
  if (!active) throw new Error("This account is not allowed to do that.");
  return active;
}
