import { auth } from "@/server/auth/edge";
import { NextResponse } from "next/server";

import { buildCsp, generateNonce } from "@/lib/csp";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/new-post", "/admin"];
const ADMIN_PREFIXES = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminOnly = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isAdminOnly && req.auth.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  // Content-Security-Policy with a fresh nonce per request. Next reads the policy from the REQUEST headers
  // to put the nonce on its own scripts; the root layout reads `x-nonce` (which also makes pages dynamic,
  // as nonces require).
  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
});

export const config = {
  // Every page and route handler, but not static assets (they have no scripts to protect).
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
