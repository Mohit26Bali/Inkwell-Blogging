import { describe, it, expect } from "vitest";
import { buildCsp, generateNonce } from "@/lib/csp";

describe("Content-Security-Policy", () => {
  const prod = buildCsp("abc123", false);

  it("only runs scripts that carry the request's nonce, and forbids eval in production", () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
  it("blocks framing, plugins and base-tag/form hijacking", () => {
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "upgrade-insecure-requests"]) {
      expect(prod).toContain(d);
    }
  });
  it("allows the UploadThing upload hosts and nothing else for connections", () => {
    expect(prod).toMatch(/connect-src 'self' https:\/\/\*\.uploadthing\.com https:\/\/\*\.ufs\.sh https:\/\/utfs\.io;/);
  });
  it("development additionally allows eval (React tooling) but production does not", () => {
    expect(buildCsp("n", true)).toContain("'unsafe-eval'");
  });
  it("nonces are unique per call", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});
