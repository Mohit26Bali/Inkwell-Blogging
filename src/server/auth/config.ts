import type { NextAuthConfig } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { z } from "zod";

import { passwordVersion } from "@/server/auth/password-version";
import { db } from "@/server/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIpFromForwardedFor, getTrustedProxyHops } from "@/lib/client-ip";
import { emailSchema } from "@/features/auth/schemas/auth.schema";
import type { Role } from "@prisma/client";

const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
});

// Per account and per client address (the address limit only applies when TRUSTED_PROXY_HOPS is set).
const LOGIN_RATE_LIMIT_PER_EMAIL = { max: 10, windowMs: 15 * 60 * 1000 };
const LOGIN_RATE_LIMIT_PER_IP = { max: 30, windowMs: 15 * 60 * 1000 };

// Compared against when the e-mail is unknown, so "no such user" takes as long as "wrong password".
let dummyHashPromise: Promise<string> | undefined;
const getDummyHash = () => (dummyHashPromise ??= bcrypt.hash("not-a-real-password", 12));

/** A free, valid username (3–30 chars, [a-z0-9_-]) derived from a display name or e-mail. */
async function generateUniqueUsername(source: string): Promise<string> {
  let base = slugify(source, { lower: true, strict: true }).replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  if (base.length < 3) base = `user${base}`;
  let candidate = base;
  for (let i = 0; i < 20; i++) {
    if (!(await db.profile.findUnique({ where: { username: candidate }, select: { id: true } }))) {
      return candidate;
    }
    candidate = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Adapter that, unlike the stock one, also creates the Profile (username) and Settings rows. Without them
 * a first-time Google/GitHub user had no username, no public page and a broken dashboard.
 */
const baseAdapter = PrismaAdapter(db) as Adapter;
const adapter: Adapter = {
  ...baseAdapter,
  async createUser(data) {
    const email = (data.email as string).toLowerCase();
    const username = await generateUniqueUsername(data.name ?? email.split("@")[0]);
    const user = await db.user.create({
      data: {
        name: data.name ?? null,
        email,
        image: data.image ?? null,
        emailVerified: data.emailVerified ?? null,
        role: "READER",
        profile: { create: { username } },
        settings: { create: {} },
      },
    });
    return user as unknown as AdapterUser;
  },
};

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials, request) {
      const parsed = credentialsSchema.safeParse(rawCredentials);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;

      const ip = clientIpFromForwardedFor(request?.headers?.get("x-forwarded-for"), getTrustedProxyHops());
      if (ip && !checkRateLimit(`login-ip:${ip}`, LOGIN_RATE_LIMIT_PER_IP)) return null;
      if (!checkRateLimit(`login:${email}`, LOGIN_RATE_LIMIT_PER_EMAIL)) return null;

      const user = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (!user?.passwordHash) {
        await bcrypt.compare(password, await getDummyHash());
        return null;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) return null;
      if (user.isBanned || user.isSuspended) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

export const authConfig: NextAuthConfig = {
  adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/",
  },
  providers,
  callbacks: {
    /**
     * Runs for EVERY provider. The password login already refuses banned/suspended accounts in
     * authorize(); this closes the same door for Google/GitHub sign-in, which never went through it.
     */
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      const existing = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { isBanned: true, isSuspended: true },
      });
      if (existing && (existing.isBanned || existing.isSuspended)) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "READER";
        const profile = await db.profile.findUnique({
          where: { userId: user.id },
          select: { username: true },
        });
        token.username = profile?.username ?? null;
        const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
        token.pwv = passwordVersion(row?.passwordHash);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.username = (token.username as string | null) ?? null;
        session.user.pwv = (token.pwv as string | undefined) ?? undefined;
      }
      return session;
    },
  },
};
