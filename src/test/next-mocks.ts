// Minimal stand-ins for Next.js request-scoped APIs and for NextAuth's `auth()`, so Server Actions can
// be called from Vitest. `setSession()` plays the role of the signed-in browser's JWT session.
type SessionUser = { id: string; name?: string | null; email?: string | null; role: string; username: string | null; pwv?: string };

let currentSession: { user: SessionUser; expires: string } | null = null;
let currentIp = "10.0.0.1";

/** What `auth()` returns. NOTE: like the real JWT session, role/username are whatever the token says. */
export function setSession(user: SessionUser | null) {
  currentSession = user ? { user, expires: new Date(Date.now() + 86_400_000).toISOString() } : null;
}
export function setClientIp(ip: string) {
  currentIp = ip;
}

export async function auth() {
  return currentSession;
}
export const handlers = { GET: async () => new Response(null), POST: async () => new Response(null) };
export async function signIn() {}
export async function signOut() {}

export async function headers() {
  return new Headers({ "user-agent": "vitest", "x-forwarded-for": currentIp });
}

export function revalidatePath() {}

export function redirect(url: string): never {
  throw new Error(`NEXT_REDIRECT:${url}`);
}
export function notFound(): never {
  throw new Error("NEXT_NOT_FOUND");
}
