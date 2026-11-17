import "server-only";

import { Resend } from "resend";

const globalForResend = globalThis as unknown as {
  resend: { key: string; client: Resend } | undefined;
};

/**
 * The Resend client, or null when RESEND_API_KEY is not set.
 *
 * It is created lazily on purpose: `new Resend()` THROWS when there is no key, and the client used to be
 * created at import time — so, despite the README ("without it, sends are logged and swallowed"), a missing
 * key crashed every page/action that imported this module, signup included.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;

  if (!globalForResend.resend || globalForResend.resend.key !== key) {
    globalForResend.resend = { key, client: new Resend(key) };
  }
  return globalForResend.resend.client;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Inkwell <onboarding@resend.dev>";
