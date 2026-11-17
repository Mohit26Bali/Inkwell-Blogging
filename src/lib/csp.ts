/**
 * Content-Security-Policy with a per-request nonce (set in middleware.ts).
 *
 * - script-src: only scripts carrying the nonce run ('strict-dynamic' lets those load their own chunks).
 *   An injected `<script>` or inline handler — e.g. from a sanitizer bug — is refused by the browser.
 * - style-src keeps 'unsafe-inline' because Next, Tailwind-based UI and the animation library set inline styles;
 *   style injection can't run code, so this is the usual trade-off.
 * - img-src allows any https image because authors may use external cover/inline images.
 * - connect-src lists UploadThing, which the browser uploads to directly.
 * 'unsafe-eval' is added only in development (React's debugging tools need it).
 */
export function buildCsp(nonce: string, isDev = process.env.NODE_ENV !== "production"): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.uploadthing.com",
      "https://*.ufs.sh",
      "https://utfs.io",
      ...(isDev ? ["ws:", "http://localhost:*"] : []),
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return (
    Object.entries(directives)
      .map(([name, values]) => `${name} ${values.join(" ")}`)
      .join("; ") + (isDev ? "" : "; upgrade-insecure-requests")
  );
}

export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}
