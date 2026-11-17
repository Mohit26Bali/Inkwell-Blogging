import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe subset of the auth config, used by middleware.
 * Excludes the Prisma adapter and Credentials provider (bcrypt) since
 * neither can run in the Edge runtime — middleware only needs the JWT session.
 */
export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/",
  },
  providers: [],
  callbacks: {
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
