import "server-only";

import { checkRateLimit } from "@/lib/rate-limit";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Per-user limits for actions that write data, send e-mail or call a paid API. Sized so normal use never
 * notices them (editor autosave runs at most every 8 s ≈ 450 per hour). In-memory, per server instance —
 * see lib/rate-limit.ts; use a shared store before running more than one instance.
 */
export const ACTION_LIMITS = {
  comment: { max: 20, windowMs: 10 * MINUTE },
  interaction: { max: 60, windowMs: 10 * MINUTE }, // like / bookmark / follow / list items
  report: { max: 10, windowMs: HOUR },
  aiAssist: { max: 20, windowMs: HOUR },
  publish: { max: 20, windowMs: HOUR },
  draftSave: { max: 600, windowMs: HOUR },
  collection: { max: 30, windowMs: HOUR },
  // At most one comment e-mail from one commenter to one recipient per window (anti e-mail-flooding).
  commentEmail: { max: 1, windowMs: 10 * MINUTE },
  // At most one welcome e-mail per address per window (the address isn't verified at signup).
  welcomeEmail: { max: 1, windowMs: HOUR },
  // Verification links: a few per hour per account/address.
  verifyEmail: { max: 3, windowMs: HOUR },
  dataExport: { max: 5, windowMs: HOUR },
  deleteAccount: { max: 5, windowMs: HOUR },
} as const;

export type ActionLimitName = keyof typeof ACTION_LIMITS;

/** Throws when `userId` has used up the named limit. */
export function enforceActionLimit(
  name: ActionLimitName,
  userId: string,
  message = "You're doing that too quickly. Please wait a moment and try again."
) {
  if (!checkRateLimit(`action:${name}:${userId}`, ACTION_LIMITS[name])) {
    throw new Error(message);
  }
}

/** Non-throwing variant for optional side effects (e.g. whether to send a notification e-mail). */
export function allowAction(name: ActionLimitName, key: string): boolean {
  return checkRateLimit(`action:${name}:${key}`, ACTION_LIMITS[name]);
}
